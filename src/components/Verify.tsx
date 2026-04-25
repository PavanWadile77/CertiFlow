import React, { useState, useEffect } from 'react';
import { collection, query, where, getDocs, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Search, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  Calendar,
  FileText,
  User as UserIcon,
  X,
  ArrowRight,
  QrCode
} from 'lucide-react';
import { Scanner } from '@yudiel/react-qr-scanner';

interface Certificate {
  id: string;
  recipientName: string;
  courseName: string;
  issueDate: any;
  grade: string;
  issuerName: string;
  issuerOrg: string;
  status: 'active' | 'revoked';
  certId: string;
  signature?: string;
}

export default function Verify() {
  const [certId, setCertId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Certificate | null>(null);
  const [requestResult, setRequestResult] = useState<any | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verifyId = params.get('verify');
    if (verifyId) {
      setCertId(verifyId);
      performVerify(verifyId);
    }
  }, []);

  const performVerify = async (idToVerify: string) => {
    if (!idToVerify.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    setRequestResult(null);

    try {
      // First check certificates (Issued)
      const q = query(collection(db, 'certificates'), where('certId', '==', idToVerify.trim()), limit(1));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        const data = { id: snap.docs[0].id, ...snap.docs[0].data() } as Certificate;
        if (data.status === 'active') {
          setResult(data);
        } else {
          setRequestResult({ status: 'Rejected', message: 'This certificate has been revoked.' });
        }
      } else {
        // Check if it's a User Document
        const docRef = doc(db, 'user_documents', idToVerify.trim());
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const docData = docSnap.data();
          setRequestResult({ 
            status: 'Verified', 
            message: `This is a verified personal ${docData.type || 'document'}.`, 
            courseName: docData.name, 
            recipientName: 'Personal Document Ledger'
          });
        } else {
          // If not found, check if it's a request ID
          const qReq = query(collection(db, 'certificate_requests'), where('__name__', '==', idToVerify.trim()), limit(1));
          const snapReq = await getDocs(qReq);
          if (!snapReq.empty) {
              const reqData = snapReq.docs[0].data();
              if (reqData.status === 'pending') {
                  setRequestResult({ status: 'Pending', message: 'Your application is currently under review.', courseName: reqData.courseName, recipientName: reqData.userName });
              } else if (reqData.status === 'rejected') {
                  setRequestResult({ status: 'Rejected', message: reqData.rejectionReason || 'Application denied.', courseName: reqData.courseName, recipientName: reqData.userName });
              } else {
                   setRequestResult({ status: 'Verified', message: 'Your application has been approved. Check your wallet for the credential.', courseName: reqData.courseName, recipientName: reqData.userName });
              }
          } else {
              setError('No record found with this ID. Please verify the code and try again.');
          }
        }
      }
    } catch (err) {
      setError('An error occurred while connecting to the registry.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    performVerify(certId);
  };

  const handleScan = (detectedCodes: any[]) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const rawText = detectedCodes[0].rawValue;
      setIsScanning(false);
      
      let finalId = rawText;
      // Try to parse out ?verify=X
      try {
        if (rawText.startsWith('http')) {
           const url = new URL(rawText);
           if (url.searchParams.has('verify')) {
               finalId = url.searchParams.get('verify') || finalId;
           }
        }
      } catch (e) {
         // Not a URL, proceed
      }
      
      setCertId(finalId);
      performVerify(finalId);
    }
  };

  return (
    <div className="min-h-screen bg-[#F5F7FA] flex flex-col items-center p-6 pt-20">
      <div className="w-full max-w-2xl">
        <header className="text-center mb-12">
           <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="text-primary" size={32} />
           </div>
           <h1 className="text-4xl font-bold text-[#1A1F26] mb-3 tracking-tighter">Verification System</h1>
           <p className="text-neutral-500">Real-time digital certificate tracking and validation.</p>
        </header>

        {isScanning ? (
           <div className="mb-12 bg-black rounded-3xl overflow-hidden relative shadow-2xl">
              <button 
                onClick={() => setIsScanning(false)}
                className="absolute top-4 right-4 z-10 w-10 h-10 bg-black/50 hover:bg-black/80 rounded-full flex items-center justify-center text-white transition-colors"
              >
                 <X size={20} />
              </button>
              <Scanner onScan={handleScan} />
           </div>
        ) : (
          <form onSubmit={handleVerify} className="relative mb-12 group">
            <input 
              value={certId}
              onChange={(e) => setCertId(e.target.value.toUpperCase())}
              placeholder="ENTER E-CERT OR REQUEST ID"
              className="w-full bg-white border border-border-muted rounded-3xl px-8 py-6 text-lg font-mono tracking-widest focus:outline-none focus:border-primary focus:ring-4 focus:ring-primary/5 transition-all shadow-xl shadow-primary/5 placeholder:text-neutral-200"
            />
            <div className="absolute right-3 top-3 bottom-3 flex items-center gap-2">
              <button 
                type="button"
                onClick={() => setIsScanning(true)}
                className="h-full px-4 text-primary bg-primary/10 hover:bg-primary/20 rounded-2xl font-bold flex items-center justify-center transition-all"
                title="Scan QR Code"
              >
                <QrCode size={20} />
              </button>
              <button 
                type="submit"
                disabled={loading}
                className="h-full px-8 bg-primary text-white rounded-2xl font-bold flex items-center gap-2 hover:bg-primary-dark transition-all disabled:opacity-50"
              >
                {loading ? 'Scanning...' : 'Verify'} <ArrowRight size={18} />
              </button>
            </div>
          </form>
        )}

        <AnimatePresence>
          {error && (
            <motion.div 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-red-50 border border-red-100 p-6 rounded-2xl flex items-start gap-4 mb-8"
            >
              <AlertTriangle className="text-red-500 shrink-0" size={24} />
              <div>
                <h4 className="font-bold text-red-900">Record Not Found</h4>
                <p className="text-red-700 text-sm">{error}</p>
              </div>
            </motion.div>
          )}

          {requestResult && (
             <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border border-border-muted rounded-[2.5rem] p-10 shadow-lg relative overflow-hidden"
             >
                <div className="flex flex-col items-center text-center">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
                        requestResult.status === 'Pending' ? 'bg-amber-50 text-amber-500' :
                        requestResult.status === 'Rejected' ? 'bg-red-50 text-red-500' : 'bg-green-50 text-green-500'
                    }`}>
                        {requestResult.status === 'Pending' ? <AlertTriangle size={32} /> :
                         requestResult.status === 'Rejected' ? <X size={32} /> : <CheckCircle2 size={32} />}
                    </div>
                    <h2 className="text-2xl font-bold text-[#1A1F26] mb-1">{requestResult.courseName || 'Status Update'}</h2>
                    <p className="text-neutral-500 text-sm mb-6">{requestResult.recipientName || 'Credential Request'}</p>

                    <div className={`px-6 py-2 rounded-full text-sm font-bold uppercase tracking-widest border mb-6 inline-flex ${
                        requestResult.status === 'Pending' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                        requestResult.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-green-100 text-green-700 border-green-200'
                    }`}>
                        {requestResult.status}
                    </div>

                    <p className="text-neutral-600 bg-neutral-50 px-6 py-4 rounded-xl border border-neutral-100 text-sm">
                        {requestResult.message}
                    </p>
                </div>
             </motion.div>
          )}

          {result && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="bg-white border-2 border-primary rounded-[2.5rem] p-10 shadow-2xl shadow-primary/10 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 p-6">
                 <div className="flex items-center gap-2 px-4 py-1.5 bg-green-50 text-green-600 rounded-full text-[10px] font-bold uppercase tracking-widest border border-green-100">
                    <CheckCircle2 size={12} /> Verified
                 </div>
              </div>


              <div className="text-center mb-10">
                <div className="bg-primary/10 w-12 h-12 rounded-xl flex items-center justify-center mx-auto mb-4">
                  <FileText className="text-primary" size={24} />
                </div>
                <h2 className="text-[10px] text-primary font-bold uppercase tracking-[0.4em] mb-1">Authenticated Certificate</h2>
                <div className="text-[10px] text-neutral-400 font-mono">Registry ID: {result.certId}</div>
              </div>

              <div className="space-y-8">
                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">PROUDLY PRESENTED TO</span>
                  <h3 className="text-3xl font-bold text-[#1A1F26]">{result.recipientName}</h3>
                </div>

                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">FOR COMPLETION OF</span>
                  <p className="text-xl font-medium text-[#1A1F26]">{result.courseName}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 border-t border-dashed border-border-muted pt-8">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-1">Issued On</span>
                    <p className="text-sm font-bold">{result.issueDate?.toDate().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-1">Issuer Authority</span>
                    <p className="text-sm font-bold text-primary truncate">{result.issuerOrg}</p>
                  </div>
                </div>

                {result.signature && (
                  <div className="pt-8 border-t border-border-muted flex justify-between items-end">
                    <div className="text-left">
                        <span className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-1">Authorized Official</span>
                        <p className="text-sm font-bold text-[#1A1F26]">{result.issuerName}</p>
                    </div>
                    <div className="text-right">
                        <span className="font-serif italic text-2xl text-neutral-800 opacity-60 mb-1 block">{result.signature}</span>
                        <span className="text-[8px] text-neutral-400 uppercase font-mono tracking-tighter">Digitally Verified Signature</span>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-12 text-center">
           <p className="text-xs text-neutral-400 uppercase tracking-[0.2em]">Institutional Registry Gateway</p>
        </div>
      </div>
    </div>
  );
}
