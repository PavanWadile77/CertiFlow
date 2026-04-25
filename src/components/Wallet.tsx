import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, getDocs, limit, orderBy, addDoc, serverTimestamp, deleteDoc, doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  Wallet as WalletIcon, 
  FileText, 
  Download, 
  Search, 
  Loader2, 
  CheckCircle2, 
  ShieldCheck, 
  Calendar,
  User as UserIcon,
  X,
  LayoutGrid,
  Award,
  Clock,
  History,
  ChevronRight,
  Plus,
  Key,
  Share2,
  UploadCloud,
  Trash2,
  FilePlus,
  AlertCircle
} from 'lucide-react';

interface Certificate {
  id: string;
  recipientName: string;
  recipientEmail: string;
  courseName: string;
  issueDate: any;
  grade: string;
  issuerName: string;
  issuerOrg: string;
  status: 'active' | 'revoked';
  certId: string;
  signature?: string;
  fileName?: string;
  fileUrl?: string;
}

interface CertificateRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  courseName: string;
  requestDate: any;
  status: 'pending' | 'approved' | 'issued' | 'rejected';
  notes?: string;
  rejectionReason?: string;
}

interface UserDoc {
  id: string;
  name: string;
  fileName: string;
  fileUrl: string;
  type: string;
  uploadDate: any;
}

export default function Wallet() {
  const { profile } = useAuth();
  const [certs, setCerts] = useState<Certificate[]>([]);
  const [userDocs, setUserDocs] = useState<UserDoc[]>([]);
  const [requests, setRequests] = useState<CertificateRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCert, setSelectedCert] = useState<Certificate | null>(null);
  const [selectedDoc, setSelectedDoc] = useState<UserDoc | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<CertificateRequest | null>(null);
  const [activeTab, setActiveTab] = useState<'dashboard' | 'wallet' | 'certificates' | 'requests' | 'wallet_access' | 'certificates_access'>('dashboard');
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [isFetchModalOpen, setIsFetchModalOpen] = useState(false);
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false);
  const [isAccessModalOpen, setIsAccessModalOpen] = useState(false);
  const [accessItem, setAccessItem] = useState<{ id: string, type: 'document' | 'certificate', name: string } | null>(null);
  const [activeGrants, setActiveGrants] = useState<any[]>([]);
  const [sharedDocs, setSharedDocs] = useState<UserDoc[]>([]);
  const [sharedCerts, setSharedCerts] = useState<Certificate[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchGrants = async () => {
    if (!accessItem) return;
    try {
      const q = query(
        collection(db, 'access_grants'),
        where('resourceId', '==', accessItem.id)
      );
      const snap = await getDocs(q);
      setActiveGrants(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (isAccessModalOpen && accessItem) {
      fetchGrants();
    }
  }, [isAccessModalOpen, accessItem]);

  const fetchWalletData = async () => {
    if (!profile) return;
    setLoading(true);
    try {
      // Fetch Certificates
      const certsList: Certificate[] = [];
      
      if (profile.email) {
        const qEmail = query(
          collection(db, 'certificates'),
          where('recipientEmail', '==', profile.email),
          where('status', '==', 'active')
        );
        const snapEmail = await getDocs(qEmail);
        snapEmail.docs.forEach(doc => certsList.push({ id: doc.id, ...doc.data() } as Certificate));
      }
      
      setCerts(certsList.sort((a, b) => b.issueDate?.toMillis() - a.issueDate?.toMillis()));

      // Fetch User Documents
      const qDocs = query(
        collection(db, 'user_documents'),
        where('userId', '==', profile.uid),
        orderBy('uploadDate', 'desc')
      );
      const snapDocs = await getDocs(qDocs);
      const docsList = snapDocs.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserDoc));
      setUserDocs(docsList);

      // Fetch Requests
      const qRequests = query(
        collection(db, 'certificate_requests'),
        where('userId', '==', profile.uid),
        orderBy('requestDate', 'desc')
      );
      const snapRequests = await getDocs(qRequests);
      const reqList = snapRequests.docs.map(doc => ({ id: doc.id, ...doc.data() } as CertificateRequest));
      setRequests(reqList);

      // Fetch Shared Resources
      if (profile.email) {
        const qGrants = query(
          collection(db, 'access_grants'),
          where('sharedWithEmail', '==', profile.email)
        );
        const snapGrants = await getDocs(qGrants);
        
        const sDocs: UserDoc[] = [];
        const sCerts: Certificate[] = [];
        
        for (const gDoc of snapGrants.docs) {
          const grant = gDoc.data();
          const col = grant.resourceType === 'document' ? 'user_documents' : 'certificates';
          try {
            const rDoc = await getDoc(doc(db, col, grant.resourceId));
            if (rDoc.exists()) {
              const data = { id: rDoc.id, ...rDoc.data() };
              if (grant.resourceType === 'document') sDocs.push(data as UserDoc);
              else sCerts.push(data as Certificate);
            }
          } catch (e) {
            console.error("Shared access denied for", grant.resourceId);
          }
        }
        setSharedDocs(sDocs);
        setSharedCerts(sCerts);
      }

    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, [profile]);

  const [uploading, setUploading] = useState(false);
  const [newDocName, setNewDocName] = useState('');
  const [newDocType, setNewDocType] = useState('Identity');
  const [newDocFile, setNewDocFile] = useState<{name: string, data: string} | null>(null);

  // Request State
  const [requesting, setRequesting] = useState(false);
  const [reqCourse, setReqCourse] = useState('');
  const [reqNotes, setReqNotes] = useState('');

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setRequesting(true);
    try {
      await addDoc(collection(db, 'certificate_requests'), {
        userId: profile.uid,
        userName: profile.displayName,
        userEmail: profile.email,
        courseName: reqCourse,
        requestDate: serverTimestamp(),
        status: 'pending',
        notes: reqNotes
      });
      setIsRequestModalOpen(false);
      setReqCourse('');
      setReqNotes('');
      fetchWalletData();
    } catch (err) {
      console.error(err);
    } finally {
      setRequesting(false);
    }
  };

  const handleGrantAccess = async (email: string) => {
    if (!profile || !accessItem) return;
    try {
      const grantId = `${email}_${accessItem.id}`;
      await setDoc(doc(db, 'access_grants', grantId), {
        resourceId: accessItem.id,
        resourceType: accessItem.type,
        ownerId: profile.uid,
        sharedWithEmail: email,
        grantedAt: serverTimestamp()
      });
      alert(`Access granted to ${email}`);
      fetchGrants();
    } catch (err) {
      console.error(err);
      alert("Failed to grant access. Check permissions.");
    }
  };

  const handleCancelRequest = async (requestId: string) => {
    if (!confirm('Cancel this request?')) return;
    try {
      await deleteDoc(doc(db, 'certificate_requests', requestId));
      fetchWalletData();
    } catch (err) {
      console.error(err);
    }
  };

  const handleFileUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !newDocFile) return;
    setUploading(true);
    try {
      await addDoc(collection(db, 'user_documents'), {
        userId: profile.uid,
        name: newDocName,
        fileName: newDocFile.name,
        fileUrl: newDocFile.data,
        type: newDocType,
        uploadDate: serverTimestamp()
      });
      setIsUploadModalOpen(false);
      setNewDocName('');
      setNewDocFile(null);
      fetchWalletData();
    } catch (err) {
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDoc = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document from your secure vault?')) return;
    try {
      await deleteDoc(doc(db, 'user_documents', docId));
      setSelectedDoc(null);
      fetchWalletData();
    } catch (err) {
      console.error(err);
    }
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert('File size exceeds 800KB. Please optimize your document for secure storage.');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setNewDocFile({
          name: file.name,
          data: reader.result as string
        });
        if (!newDocName) setNewDocName(file.name.split('.')[0]);
      };
      reader.readAsDataURL(file);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin text-primary" /></div>;

  return (
    <div className="flex min-h-[calc(100vh-73px)]">
      {/* User Sidebar */}
      <aside className="w-64 bg-white border-r border-border-muted flex flex-col p-6 gap-2">
        <button 
          onClick={() => setActiveTab('dashboard')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'dashboard' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-primary-light hover:text-primary'}`}
        >
          <LayoutGrid size={18} /> Dashboard
        </button>
        <button 
          onClick={() => setActiveTab('wallet')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'wallet' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-primary-light hover:text-primary'}`}
        >
          <WalletIcon size={18} /> Document Wallet
        </button>
        <button 
          onClick={() => setActiveTab('certificates')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'certificates' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-primary-light hover:text-primary'}`}
        >
          <Award size={18} /> My Certificates
        </button>
        <button 
          onClick={() => setActiveTab('requests')}
          className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${activeTab === 'requests' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-primary-light hover:text-primary'}`}
        >
          <History size={18} /> Application Status
        </button>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-8 bg-[#F5F7FA] overflow-y-auto">
        {activeTab === 'dashboard' && (
          <div className="max-w-5xl mx-auto">
             <header className="mb-10">
                <h1 className="text-3xl font-bold text-[#1A1F26] mb-2 tracking-tight">Welcome, {profile?.displayName}</h1>
                <p className="text-neutral-500">Overview of your secured digital documents.</p>
             </header>

             <div className="grid md:grid-cols-3 gap-6 mb-10">
                <div className="bg-white p-6 rounded-3xl border border-border-muted shadow-sm">
                   <div className="w-12 h-12 bg-blue-50 text-primary rounded-xl flex items-center justify-center mb-4">
                      <FileText size={24} />
                   </div>
                   <p className="text-3xl font-bold text-[#1A1F26]">{certs.length + userDocs.length}</p>
                   <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Total Documents</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-border-muted shadow-sm">
                   <div className="w-12 h-12 bg-green-50 text-green-600 rounded-xl flex items-center justify-center mb-4">
                      <ShieldCheck size={24} />
                   </div>
                   <p className="text-3xl font-bold text-[#1A1F26]">{certs.length}</p>
                   <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Verified Records</p>
                </div>
                <div className="bg-white p-6 rounded-3xl border border-border-muted shadow-sm">
                   <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-xl flex items-center justify-center mb-4">
                      <Clock size={24} />
                   </div>
                   <p className="text-3xl font-bold text-[#1A1F26]">{requests.filter(r => r.status === 'pending').length}</p>
                   <p className="text-xs font-bold text-neutral-400 uppercase tracking-widest">Pending Requests</p>
                </div>
             </div>

             <div className="grid md:grid-cols-2 gap-8">
                <div className="bg-white rounded-3xl border border-border-muted shadow-sm p-8">
                   <div className="flex items-center justify-between mb-6">
                       <h3 className="text-xl font-bold">Recent Certificates</h3>
                       <button onClick={() => setActiveTab('certificates')} className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">View All</button>
                   </div>
                   <div className="space-y-4">
                      {certs.slice(0, 3).map((cert, i) => (
                         <div key={i} className="flex items-center justify-between p-4 bg-[#F5F7FA] rounded-2xl">
                            <div className="flex items-center gap-4">
                               <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-primary shadow-sm">
                                  <Award size={20} />
                               </div>
                               <div>
                                  <p className="font-bold text-sm text-[#1A1F26]">{cert.courseName}</p>
                                  <p className="text-xs text-neutral-400">Issued by {cert.issuerOrg}</p>
                               </div>
                            </div>
                            <button 
                             onClick={() => { setActiveTab('certificates'); setSelectedCert(cert); }}
                             className="p-2 text-neutral-400 hover:text-primary transition-colors"
                            >
                               <ChevronRight size={20} />
                            </button>
                         </div>
                      ))}
                      {certs.length === 0 && <p className="text-center text-neutral-400 py-4 italic text-sm">No certificates found.</p>}
                   </div>
                </div>

                <div className="bg-white rounded-3xl border border-border-muted shadow-sm p-8">
                   <div className="flex items-center justify-between mb-6">
                       <h3 className="text-xl font-bold">Application Tracker</h3>
                       <button onClick={() => setActiveTab('requests')} className="text-xs font-bold text-primary uppercase tracking-widest hover:underline">Full History</button>
                   </div>
                   <div className="space-y-4">
                      {requests.slice(0, 3).map((req, i) => (
                         <div key={i} className="p-4 bg-[#F5F7FA] rounded-2xl">
                            <div className="flex items-center justify-between mb-2">
                               <p className="font-bold text-sm text-[#1A1F26] line-clamp-1">{req.courseName}</p>
                               <span className={`text-[9px] font-bold uppercase px-2 py-0.5 rounded-full ${
                                   req.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                   req.status === 'approved' ? 'bg-blue-100 text-blue-600' : 
                                   req.status === 'issued' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                               }`}>{req.status}</span>
                            </div>
                            <div className="flex items-center justify-between">
                               <p className="text-[10px] text-neutral-400 font-mono">{req.requestDate?.toDate().toLocaleDateString()}</p>
                               {req.status === 'pending' && (
                                   <div className="flex gap-1">
                                       <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                                       <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-75" />
                                       <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse delay-150" />
                                   </div>
                               )}
                            </div>
                         </div>
                      ))}
                      {requests.length === 0 && (
                          <div className="text-center py-6">
                              <p className="text-xs text-neutral-400 mb-4 italic">No pending applications.</p>
                              <button 
                               onClick={() => setIsRequestModalOpen(true)}
                               className="text-xs font-bold text-primary bg-primary/10 px-4 py-2 rounded-lg hover:bg-primary hover:text-white transition-all"
                              >
                                  Apply for Certificate
                              </button>
                          </div>
                      )}
                   </div>
                </div>
             </div>
          </div>
        )}

        {(activeTab === 'wallet' || activeTab === 'certificates') && (
          <div className="max-w-6xl mx-auto">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h1 className="text-3xl font-bold text-[#1A1F26] mb-2 flex items-center gap-3">
                  {activeTab === 'wallet' ? <WalletIcon className="text-primary" /> : <Award className="text-primary" />} 
                  {activeTab === 'wallet' ? 'Document Wallet' : 'My Certificates'}
                </h1>
                <p className="text-neutral-500">
                  {activeTab === 'wallet' ? 'All your verified digital credentials and important files in one place.' :
                   'Formal educational and professional certificates issued to you.'}
                </p>
              </div>
              
              <div className="flex items-center gap-4">
                {activeTab === 'wallet' && (
                  <>
                    <button 
                      onClick={() => setIsFetchModalOpen(true)}
                      className="bg-[#F5F7FA] text-primary border border-primary/20 px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/5 transition-all"
                    >
                      <Search size={18} /> Access Document
                    </button>
                    <button 
                      onClick={() => setIsUploadModalOpen(true)}
                      className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-dark transition-all"
                    >
                      <Plus size={18} /> Add Document
                    </button>
                  </>
                )}
                {activeTab === 'certificates' && (
                  <button 
                    onClick={() => setIsFetchModalOpen(true)}
                    className="bg-[#F5F7FA] text-primary border border-primary/20 px-6 py-2 rounded-xl font-bold text-sm flex items-center gap-2 hover:bg-primary/5 transition-all"
                  >
                    <Search size={18} /> Access Certificate
                  </button>
                )}
              </div>
            </header>

            {(activeTab === 'wallet' ? userDocs.length : certs.length) === 0 ? (
              <div className="bg-white border border-border-muted rounded-3xl p-20 text-center flex flex-col items-center shadow-sm">
                <div className="bg-[#F5F7FA] w-20 h-20 rounded-full flex items-center justify-center mb-6">
                  {activeTab === 'wallet' ? <FileText className="text-neutral-300" size={40} /> : <Award className="text-neutral-300" size={40} />}
                </div>
                <h2 className="text-xl font-bold mb-2">No items found</h2>
                <p className="text-neutral-500 max-w-xs mx-auto text-sm">
                  {activeTab === 'wallet' 
                    ? 'Upload your own identity proofs, medical records, or personal files for secure cloud access.' 
                    : `Certificates issued to your email (${profile?.email || 'N/A'}) or mobile (${profile?.phoneNumber || 'N/A'}) will automatically appear here.`}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {(activeTab === 'wallet' ? [...userDocs, ...sharedDocs] : [...certs, ...sharedCerts]).map((item) => {
                  const isCert = 'courseName' in item;
                  const isShared = sharedDocs.includes(item as any) || sharedCerts.includes(item as any);
                  return (
                    <motion.div
                      layoutId={item.id}
                      key={item.id}
                      onClick={() => isCert ? setSelectedCert(item as Certificate) : setSelectedDoc(item as UserDoc)}
                      className="bg-white border border-border-muted rounded-3xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all cursor-pointer group"
                    >
                      <div className="flex justify-between items-start mb-6">
                        <div className={`w-12 h-12 ${isCert ? 'bg-primary-light text-primary' : 'bg-green-50 text-green-600'} rounded-2xl flex items-center justify-center group-hover:scale-110 transition-all shadow-sm`}>
                          {isCert ? <ShieldCheck size={28} /> : <FileText size={28} />}
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] text-neutral-400 uppercase tracking-widest font-bold">{isCert ? 'Issued By' : isShared ? 'Shared By' : 'Personal Doc'}</span>
                          <p className={`text-xs font-bold truncate max-w-[120px] ${isCert ? 'text-primary' : 'text-green-600'}`}>
                            {isCert ? ((item as Certificate).issuerOrg || (item as Certificate).issuerName) : 
                             isShared ? 'Digital Vault' : (item as UserDoc).type || 'Document'}
                          </p>
                        </div>
                      </div>

                      <h3 className="text-lg font-bold text-[#1A1F26] mb-1 line-clamp-1 group-hover:text-primary transition-colors">
                        {isCert ? (item as Certificate).courseName : (item as UserDoc).name}
                      </h3>
                      <div className="flex items-center gap-2 mb-6">
                        <p className="text-neutral-500 text-sm">{isCert ? (item as Certificate).recipientName : (item as UserDoc).fileName}</p>
                        {isCert && (item as Certificate).fileUrl && (
                          <div className="flex items-center gap-1 text-[8px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded uppercase tracking-tighter">
                            <FileText size={8} /> Original Attached
                          </div>
                        )}
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t border-dashed border-neutral-100">
                        <div className="flex items-center gap-2 text-[10px] text-neutral-400 font-mono tracking-tighter">
                          <Calendar size={12} /> {isCert ? (item as Certificate).issueDate?.toDate().toLocaleDateString() : (item as UserDoc).uploadDate?.toDate().toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-2">
                          {!isShared && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setAccessItem({ 
                                  id: item.id, 
                                  type: isCert ? 'certificate' : 'document', 
                                  name: isCert ? (item as Certificate).courseName : (item as UserDoc).name 
                                });
                                setIsAccessModalOpen(true);
                              }}
                              className="p-2 bg-amber-50 text-amber-600 rounded-lg hover:bg-amber-600 hover:text-white transition-all group/btn shadow-sm"
                              title={isCert ? "Certificate Access" : "Document Access"}
                            >
                              <Key size={14} className="group-hover/btn:rotate-12 transition-transform" />
                            </button>
                          )}
                          {(isCert ? (item as Certificate).fileUrl : (item as UserDoc).fileUrl) && (
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                const a = document.createElement('a');
                                a.href = isCert ? (item as Certificate).fileUrl! : (item as UserDoc).fileUrl;
                                a.download = isCert ? ((item as Certificate).fileName || 'certificate.pdf') : (item as UserDoc).fileName;
                                a.click();
                              }}
                              className="p-2 bg-primary/10 text-primary rounded-lg hover:bg-primary hover:text-white transition-all group/btn shadow-sm"
                              title="Direct Download"
                            >
                              <Download size={14} className="group-hover/btn:scale-110 transition-transform" />
                            </button>
                          )}
                          <span className={`text-xs font-bold px-3 py-1 rounded-full uppercase tracking-tighter ${isCert ? 'bg-[#E7F3FF] text-primary' : 'bg-green-50 text-green-600'}`}>View</span>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}
        {activeTab === 'requests' && (
            <div className="max-w-5xl mx-auto">
               <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h1 className="text-3xl font-bold text-[#1A1F26] mb-2 flex items-center gap-3">
                      <History className="text-primary" /> Application Status
                    </h1>
                    <p className="text-neutral-500">Track and manage your requests for official certificates.</p>
                  </div>
                  <button 
                    onClick={() => setIsRequestModalOpen(true)}
                    className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-dark transition-all"
                  >
                    <FilePlus size={18} /> New Request
                  </button>
               </header>

               {requests.length === 0 ? (
                  <div className="bg-white border border-border-muted rounded-3xl p-20 text-center flex flex-col items-center">
                    <div className="bg-[#F5F7FA] w-20 h-20 rounded-full flex items-center justify-center mb-6 text-neutral-300">
                        <History size={40} />
                    </div>
                    <h2 className="text-xl font-bold mb-2">No applications found</h2>
                    <p className="text-neutral-500 max-w-xs mx-auto mb-6">You haven't requested any certificates yet. Once you make a request, you can monitor its progress here.</p>
                  </div>
               ) : (
                  <div className="space-y-6">
                     {requests.map((req) => (
                        <div key={req.id} className="bg-white border border-border-muted rounded-[2rem] p-8 shadow-sm">
                           <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                              <div className="flex items-start gap-6">
                                 <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${
                                    req.status === 'pending' ? 'bg-amber-50 text-amber-500' :
                                    req.status === 'approved' ? 'bg-blue-50 text-blue-500' :
                                    req.status === 'issued' ? 'bg-green-50 text-green-500' : 'bg-red-50 text-red-500'
                                 }`}>
                                    {req.status === 'pending' ? <Clock size={32} /> :
                                     req.status === 'approved' ? <CheckCircle2 size={32} /> :
                                     req.status === 'issued' ? <ShieldCheck size={32} /> : <X size={32} />}
                                 </div>
                                 <div>
                                    <h3 className="text-xl font-bold text-[#1A1F26] mb-1">{req.courseName}</h3>
                                    <div className="flex items-center gap-4 text-xs text-neutral-400">
                                       <span className="flex items-center gap-1"><Calendar size={12} /> {req.requestDate?.toDate().toLocaleDateString()}</span>
                                       <span className="font-bold text-neutral-300">|</span>
                                       <span className="uppercase font-bold tracking-widest text-[10px]">Reference: {req.id.slice(0, 8).toUpperCase()}</span>
                                    </div>
                                 </div>
                              </div>

                              <div className="flex flex-col items-end gap-3">
                                 <div className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2 ${
                                    req.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                    req.status === 'approved' ? 'bg-blue-100 text-blue-600' :
                                    req.status === 'issued' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                 }`}>
                                    {req.status === 'pending' && <Loader2 className="animate-spin" size={14} />}
                                    {req.status}
                                 </div>
                                 {req.status === 'pending' && (
                                     <button 
                                      onClick={() => handleCancelRequest(req.id)}
                                      className="text-[10px] items-center gap-1 font-bold text-red-400 hover:text-red-500 transition-colors uppercase tracking-widest flex"
                                     >
                                         <Trash2 size={12} /> Cancel Request
                                     </button>
                                 )}
                              </div>
                           </div>

                           {/* Status Timeline */}
                           <div className="mt-8 pt-8 border-t border-dashed border-neutral-100">
                              <div className="flex items-center justify-between max-w-2xl mx-auto relative">
                                 {/* Line */}
                                 <div className="absolute top-1/2 left-0 w-full h-0.5 bg-neutral-100 -translate-y-1/2" />
                                 <div className={`absolute top-1/2 left-0 h-0.5 bg-primary -translate-y-1/2 transition-all duration-1000 ${
                                     req.status === 'pending' ? 'w-1/3' : 
                                     req.status === 'approved' ? 'w-2/3' : 'w-full'
                                 }`} />

                                 {[
                                     { label: 'Requested', sub: req.requestDate?.toDate().toLocaleDateString(), active: true },
                                     { label: 'Approved', sub: req.status === 'pending' ? 'Pending Approval' : 'Review Complete', active: req.status !== 'pending' },
                                     { label: req.status === 'rejected' ? 'Rejected' : 'Issued', sub: (req.status === 'pending' || req.status === 'approved') ? 'Pending Issuance' : 'Final status', active: req.status === 'issued' || req.status === 'rejected' }
                                 ].map((step, idx) => (
                                     <div key={idx} className="relative z-10 flex flex-col items-center">
                                         <div className={`w-4 h-4 rounded-full border-2 border-white shadow-sm transition-colors duration-500 ${
                                             step.active ? (req.status === 'rejected' && idx === 2 ? 'bg-red-500' : 'bg-primary') : 'bg-neutral-200'
                                         }`} />
                                         <div className="absolute top-6 whitespace-nowrap text-center">
                                            <p className={`text-[10px] font-bold uppercase tracking-tighter ${step.active ? 'text-[#1A1F26]' : 'text-neutral-300'}`}>{step.label}</p>
                                            <p className="text-[8px] text-neutral-400 italic">{step.sub}</p>
                                         </div>
                                     </div>
                                 ))}
                              </div>
                           </div>

                           {req.rejectionReason && (
                               <div className="mt-16 p-4 bg-red-50 rounded-xl border border-red-100">
                                   <p className="text-[10px] text-red-400 font-bold uppercase tracking-widest mb-1">Rejection Reason</p>
                                   <p className="text-sm text-red-700">{req.rejectionReason}</p>
                               </div>
                           )}
                           
                           {req.notes && (
                               <div className="mt-16 p-4 bg-neutral-50 rounded-xl border border-neutral-100">
                                   <p className="text-[10px] text-neutral-400 font-bold uppercase tracking-widest mb-1">Your Application Note</p>
                                   <p className="text-sm text-neutral-600">{req.notes}</p>
                               </div>
                           )}
                        </div>
                     ))}
                  </div>
               )}
            </div>
        )}
      </main>

      {/* Modal - Certificate Detail */}
      <AnimatePresence>
        {selectedCert && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedCert(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md" 
            />
            <motion.div 
              layoutId={selectedCert.id}
              className="bg-white w-full max-w-xl rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setSelectedCert(null)}
                className="absolute top-6 right-6 p-2 bg-[#F5F7FA] rounded-full text-neutral-400 hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>

              <div className="text-center mb-10">
                <div className="bg-primary/10 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <ShieldCheck className="text-primary" size={32} />
                </div>
                <h2 className="text-xs text-primary font-bold uppercase tracking-[0.4em] mb-2">Authenticated Digital Record</h2>
                <div className="text-[10px] text-neutral-400 font-mono">ID: {selectedCert.certId}</div>
              </div>

              <div className="space-y-8 relative z-10">
                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">THIS CERTIFICATE IS PROUDLY PRESENTED TO</span>
                  <h3 className="text-3xl font-bold text-[#1A1F26]">{selectedCert.recipientName}</h3>
                </div>

                <div className="text-center">
                  <span className="text-[10px] text-neutral-500 uppercase tracking-widest block mb-1">FOR SUCCESSFUL COMPLETION OF</span>
                  <p className="text-xl font-medium text-[#1A1F26] px-4">{selectedCert.courseName}</p>
                </div>

                <div className="grid grid-cols-2 gap-8 border-t border-border-muted pt-8">
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-1">Issued On</span>
                    <p className="text-sm font-bold">{selectedCert.issueDate?.toDate().toLocaleDateString()}</p>
                  </div>
                  <div>
                    <span className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-1">Grade / Award</span>
                    <p className="text-sm font-bold text-primary">{selectedCert.grade || 'PARTICIPATION'}</p>
                  </div>
                </div>

                <div className="pt-8 border-t border-border-muted flex justify-between items-end">
                  <div className="text-left flex flex-col items-start gap-4">
                    <div>
                      <span className="text-[10px] text-neutral-400 uppercase tracking-widest block mb-2">Digitally Signed By</span>
                      <p className="text-sm font-bold text-[#1A1F26]">{selectedCert.issuerName}</p>
                      <p className="text-[10px] text-neutral-500">{selectedCert.issuerOrg}</p>
                    </div>
                    
                    <div className="mt-2 p-2 bg-white border border-border-muted rounded-xl shadow-sm">
                       <QRCodeSVG 
                         value={`${window.location.origin}?verify=${selectedCert.certId}`} 
                         size={80} 
                         level="H"
                         includeMargin={false}
                       />
                       <p className="text-[8px] font-bold text-center mt-2 text-neutral-400 uppercase tracking-wider">Scan to Verify</p>
                    </div>
                  </div>
                  
                  {selectedCert.signature ? (
                     <div className="text-right">
                        <span className="font-serif italic text-2xl text-neutral-800 opacity-60 mb-1 block">{selectedCert.signature}</span>
                        <span className="text-[8px] text-neutral-400 uppercase block font-mono font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded">Digitally Signed</span>
                     </div>
                  ) : (
                    <div className="text-right">
                       <p className="text-[8px] text-neutral-400 uppercase block font-mono font-bold text-primary bg-primary/5 px-2 py-0.5 rounded">Digital Seal Active</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-10 flex flex-col gap-3">
                {selectedCert.fileUrl && (
                  <a 
                    href={selectedCert.fileUrl} 
                    download={selectedCert.fileName || 'certificate.pdf'}
                    className="flex-1 bg-green-600 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-green-700 transition-all shadow-lg shadow-green-100"
                  >
                    <Download size={18} /> Download Original Document
                  </a>
                )}
                <button className="flex-1 bg-primary/10 text-primary py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/20 transition-all">
                  <FileText size={18} /> Export System Receipt
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Personal Document Detail */}
      <AnimatePresence>
        {selectedDoc && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedDoc(null)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md" 
            />
            <motion.div 
              layoutId={selectedDoc.id}
              className="bg-white w-full max-w-lg rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl"
            >
              <button 
                onClick={() => setSelectedDoc(null)}
                className="absolute top-6 right-6 p-2 bg-[#F5F7FA] rounded-full text-neutral-400 hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>

              <div className="flex flex-col items-center text-center">
                 <div className="w-20 h-20 bg-green-50 text-green-600 rounded-3xl flex items-center justify-center mb-6">
                    <FileText size={40} />
                 </div>
                 <h2 className="text-2xl font-bold text-[#1A1F26] mb-2">{selectedDoc.name}</h2>
                 <p className="text-neutral-500 mb-8">Personal {selectedDoc.type} Document</p>

                 <div className="w-full bg-[#F5F7FA] rounded-2xl p-6 space-y-4 mb-4">
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-neutral-400 uppercase tracking-widest font-bold">File Name</span>
                       <span className="font-bold text-[#1A1F26]">{selectedDoc.fileName}</span>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                       <span className="text-neutral-400 uppercase tracking-widest font-bold">Uploaded On</span>
                       <span className="font-bold text-[#1A1F26]">{selectedDoc.uploadDate?.toDate().toLocaleDateString()}</span>
                    </div>
                 </div>

                 <div className="w-full flex items-center justify-center p-4 bg-white border border-border-muted rounded-2xl mb-8 shadow-sm">
                    <div className="text-center">
                       <QRCodeSVG 
                         value={`${window.location.origin}?verify=${selectedDoc.id}`} 
                         size={120} 
                         level="H"
                         includeMargin={false}
                       />
                       <p className="text-[10px] font-bold mt-2 text-neutral-400 uppercase tracking-widest">Scan to Verify Document</p>
                    </div>
                 </div>

                 <div className="w-full flex flex-col gap-3">
                    <a 
                      href={selectedDoc.fileUrl}
                      download={selectedDoc.fileName}
                      className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary-dark transition-all"
                    >
                      <Download size={18} /> Download Document
                    </a>
                    <button 
                      onClick={() => handleDeleteDoc(selectedDoc.id)}
                      className="w-full bg-red-50 text-red-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
                    >
                      <Trash2 size={18} /> Remove from Vault
                    </button>
                 </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Upload Personal Document */}
      <AnimatePresence>
        {isUploadModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsUploadModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-[#1A1F26] mb-2 flex items-center gap-3">
                <FilePlus className="text-primary" /> Store Document
              </h2>
              <p className="text-neutral-500 text-sm mb-8">Securely upload your records to the encrypted cloud vault.</p>

              <form onSubmit={handleFileUpload} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Document Name</label>
                    <input 
                      required
                      value={newDocName}
                      onChange={(e) => setNewDocName(e.target.value)}
                      placeholder="e.g. Aadhaar Card, Rent Agreement"
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Category</label>
                    <select 
                      value={newDocType}
                      onChange={(e) => setNewDocType(e.target.value)}
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm appearance-none"
                    >
                       <option>Identity</option>
                       <option>Education</option>
                       <option>Medical</option>
                       <option>Property</option>
                       <option>Other</option>
                    </select>
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Choose File</label>
                    <div 
                      onClick={() => fileInputRef.current?.click()}
                      className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${newDocFile ? 'border-primary bg-primary/5' : 'border-neutral-200 hover:border-primary/50'}`}
                    >
                       <input 
                         ref={fileInputRef}
                         type="file"
                         hidden
                         onChange={onFileChange}
                         accept=".pdf,.jpg,.jpeg,.png"
                       />
                       {newDocFile ? (
                         <div className="flex items-center gap-3 justify-center">
                            <FileText className="text-primary" />
                            <span className="text-sm font-bold truncate max-w-[200px]">{newDocFile.name}</span>
                         </div>
                       ) : (
                         <div className="flex flex-col items-center gap-2">
                            <UploadCloud className="text-neutral-300" size={32} />
                            <p className="text-xs text-neutral-500 font-medium">Click to select file (Max 800KB)</p>
                         </div>
                       )}
                    </div>
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsUploadModalOpen(false)}
                      className="flex-1 px-6 py-4 border border-border-muted rounded-2xl font-bold text-neutral-500 hover:bg-neutral-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={!newDocFile || uploading}
                      type="submit"
                      className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {uploading ? <Loader2 className="animate-spin" size={18} /> : 'Save Securely'}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Modal - Request Certificate */}
      <AnimatePresence>
        {isRequestModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRequestModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-[#1A1F26] mb-2 flex items-center gap-3">
                <FilePlus className="text-primary" /> Apply for Certificate
              </h2>
              <p className="text-neutral-500 text-sm mb-8">Request an official credential from our verified institutions.</p>

              <form onSubmit={handleCreateRequest} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Course / Event Name</label>
                    <input 
                      required
                      value={reqCourse}
                      onChange={(e) => setReqCourse(e.target.value)}
                      placeholder="e.g. Master of Business Administration"
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm"
                    />
                 </div>

                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Additional Notes</label>
                    <textarea 
                      value={reqNotes}
                      onChange={(e) => setReqNotes(e.target.value)}
                      placeholder="Mention batch year, roll number, or any specific details..."
                      rows={3}
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm resize-none"
                    />
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setIsRequestModalOpen(false)}
                      className="flex-1 px-6 py-4 border border-border-muted rounded-2xl font-bold text-neutral-500 hover:bg-neutral-50 transition-all"
                    >
                      Cancel
                    </button>
                    <button 
                      disabled={!reqCourse || requesting}
                      type="submit"
                      className="flex-1 px-6 py-4 bg-primary text-white rounded-2xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {requesting ? <Loader2 className="animate-spin" size={18} /> : 'Submit Request'}
                    </button>
                 </div>
                 
                 <p className="text-[10px] text-neutral-400 text-center leading-relaxed">
                   Your request will be monitored by the institution's registry department. You will be notified via the app status tracker upon approval.
                 </p>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Access Control Modal */}
      <AnimatePresence>
        {isAccessModalOpen && accessItem && (
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAccessModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] relative overflow-hidden shadow-2xl p-10"
            >
              <button 
                onClick={() => setIsAccessModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-neutral-400 hover:text-primary transition-colors"
              >
                <X size={20} />
              </button>

              <div className="mb-8 text-center">
                <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                  <Key size={32} />
                </div>
                <h2 className="text-2xl font-bold text-[#1A1F26] mb-1">
                  {accessItem.type === 'certificate' ? 'Certificate Access' : 'Document Access'}
                </h2>
                <p className="text-neutral-500 text-sm italic line-clamp-1">{accessItem.name}</p>
              </div>

              <div className="space-y-6">
                <div className="p-4 bg-amber-50/50 border border-amber-100 rounded-2xl">
                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed text-center">
                    Share this vault item with other verified users. They will be able to view and download the official document through their own wallet once access is granted.
                  </p>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Recipient Registry Email</label>
                  <div className="relative group">
                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 group-focus-within:text-primary transition-colors">
                      <Search size={18} />
                    </div>
                    <input 
                      autoFocus
                      type="email"
                      placeholder="Enter their login email..."
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl pl-12 pr-4 py-4 focus:border-primary outline-none transition-all text-sm"
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter') {
                          const email = (e.currentTarget as HTMLInputElement).value;
                          if (email) {
                             await handleGrantAccess(email);
                             (e.currentTarget as HTMLInputElement).value = '';
                          }
                        }
                      }}
                    />
                  </div>
                </div>

                {activeGrants.length > 0 && (
                  <div className="space-y-3">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Active Access</label>
                    <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                      {activeGrants.map(grant => (
                        <div key={grant.id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-xl border border-neutral-100 animate-in fade-in slide-in-from-top-1">
                          <div className="flex items-center gap-2 overflow-hidden">
                            <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center border border-neutral-100 shrink-0">
                              <UserIcon size={14} className="text-neutral-400" />
                            </div>
                            <p className="text-xs font-medium text-neutral-600 truncate">{grant.sharedWithEmail}</p>
                          </div>
                          <button 
                            onClick={async () => {
                              try {
                                await deleteDoc(doc(db, 'access_grants', grant.id));
                                fetchGrants();
                              } catch (err) {
                                console.error(err);
                              }
                            }}
                            className="p-1.5 text-neutral-400 hover:text-red-500 transition-colors"
                            title="Revoke Access"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="pt-4">
                  <button 
                    onClick={() => {
                        setIsAccessModalOpen(false);
                    }}
                    className="w-full bg-[#1A1F26] text-white py-4 rounded-2xl font-bold hover:bg-neutral-800 transition-all flex items-center justify-center gap-2"
                  >
                    Done
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
        {isFetchModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm">
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-[2rem] p-8 max-w-md w-full shadow-2xl"
            >
              <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary">
                    <Search size={24} />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">Access {activeTab === 'wallet' ? 'Document' : 'Certificate'}</h2>
                    <p className="text-sm text-neutral-500">Fetch from national registries</p>
                  </div>
                </div>
                <button onClick={() => setIsFetchModalOpen(false)} className="p-2 text-neutral-400 hover:text-black transition-colors rounded-xl hover:bg-neutral-100">
                  <X size={20} />
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Participant Name</label>
                  <input placeholder="Enter your full name" className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl px-4 py-4 focus:border-primary outline-none transition-all text-sm font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Select Organizer / Issuer</label>
                  <select className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl px-4 py-4 focus:border-primary outline-none transition-all text-sm font-medium">
                    <option value="">Select Issuer...</option>
                    <option value="state_board">State Education Board</option>
                    <option value="central_board">Central Education Board</option>
                    <option value="ministry_health">Ministry of Health</option>
                    <option value="transport_dept">Transport Department</option>
                    <option value="uidai">Identity Authority</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">{activeTab === 'wallet' ? 'Document Type' : 'Certificate Type'}</label>
                  <select className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl px-4 py-4 focus:border-primary outline-none transition-all text-sm font-medium">
                    <option value="">Select Type...</option>
                    {activeTab === 'wallet' ? (
                      <>
                        <option value="id">Identity Card</option>
                        <option value="driving">Driving License</option>
                        <option value="vehicle">Vehicle Registration (RC)</option>
                        <option value="health">Health Record</option>
                      </>
                    ) : (
                      <>
                        <option value="10th">Class X Marksheet/Certificate</option>
                        <option value="12th">Class XII Marksheet/Certificate</option>
                        <option value="degree">Degree Certificate</option>
                        <option value="diploma">Diploma</option>
                      </>
                    )}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">{activeTab === 'wallet' ? 'Document Name' : 'Certificate Name'}</label>
                  <input placeholder={`Enter ${activeTab === 'wallet' ? 'Document' : 'Certificate'} Name`} className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl px-4 py-4 focus:border-primary outline-none transition-all text-sm font-medium" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest ml-4">Document/Roll Number</label>
                  <input placeholder="Enter Document ID / Roll Number" className="w-full bg-[#F5F7FA] border border-border-muted rounded-2xl px-4 py-4 focus:border-primary outline-none transition-all text-sm font-medium" />
                </div>
                <button 
                  onClick={() => {
                    // Fake fetch success
                    alert(`${activeTab === 'wallet' ? 'Document' : 'Certificate'} synchronized successfully! This item was fetched from the registry and added to your wallet.`);
                    setIsFetchModalOpen(false);
                  }}
                  className="w-full bg-primary text-white py-4 rounded-2xl font-bold hover:bg-primary-dark transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
                >
                  <Search size={18} /> Fetch & Synchronize
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
