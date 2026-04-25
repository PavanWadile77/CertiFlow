import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs, limit, updateDoc, doc, orderBy } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { QRCodeSVG } from 'qrcode.react';
import Verify from './Verify';
import { 
  Plus, 
  Send, 
  Users, 
  CheckCircle, 
  PenTool, 
  ShieldCheck, 
  LayoutGrid, 
  History,
  Clock,
  AlertCircle,
  Mail,
  User as UserIcon,
  BookOpen,
  Award,
  Loader2,
  UploadCloud,
  FileText as FileIcon,
  X as XIcon,
  Search,
  ChevronRight,
  Code
} from 'lucide-react';

export default function OrganiserDashboard() {
  const { profile, logout } = useAuth();
  const [view, setView] = useState<'stats' | 'upload_certificate' | 'participant_certificates' | 'upload_document' | 'document_storage' | 'history' | 'participants' | 'requests' | 'doc_history'>('stats');
  const [issueMode, setIssueMode] = useState<'manual' | 'design' | 'api'>('manual');
  const [stats, setStats] = useState({ total: 0, active: 0 });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [docSuccess, setDocSuccess] = useState(false);
  const [lastIssuedId, setLastIssuedId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form State - Certificates
  const [recipientName, setRecipientName] = useState('');
  const [recipientEmail, setRecipientEmail] = useState('');
  const [courseName, setCourseName] = useState('');
  const [grade, setGrade] = useState('');
  const [signature, setSignature] = useState(''); 
  const [attachedFile, setAttachedFile] = useState<{name: string, data: string} | null>(null);

  // Form State - Documents
  const [docRecipientName, setDocRecipientName] = useState('');
  const [docRecipientId, setDocRecipientId] = useState('');
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState('Transcript');
  const [docFile, setDocFile] = useState<{name: string, data: string} | null>(null);

  // Participants State
  const [participants, setParticipants] = useState<any[]>([]);
  const [fetchingParticipants, setFetchingParticipants] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Requests State
  const [requests, setRequests] = useState<any[]>([]);
  const [fetchingRequests, setFetchingRequests] = useState(false);
  const [activeRequestId, setActiveRequestId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  
  const [userDocs, setUserDocs] = useState<any[]>([]);
  const [issuedCerts, setIssuedCerts] = useState<any[]>([]);
  const [fetchingDocs, setFetchingDocs] = useState(false);
  const [fetchingCerts, setFetchingCerts] = useState(false);

  useEffect(() => {
    const fetchStats = async () => {
      if (!profile?.uid) return;
      const q = query(
        collection(db, 'certificates'), 
        where('issuerId', '==', profile.uid)
      );
      const snap = await getDocs(q);
      setStats({
        total: snap.size,
        active: snap.docs.filter(d => d.data().status === 'active').length
      });
    };

    const fetchParticipants = async () => {
        if (view !== 'participants') return;
        setFetchingParticipants(true);
        try {
            const q = query(
                collection(db, 'profiles'),
                where('role', '==', 'user')
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setParticipants(list);
        } catch (err) {
            console.error("Error fetching participants:", err);
        } finally {
            setFetchingParticipants(false);
        }
    };

    const fetchRequests = async () => {
        if (view !== 'requests' && view !== 'stats') return;
        setFetchingRequests(true);
        try {
            const q = query(
                collection(db, 'certificate_requests'),
                orderBy('requestDate', 'desc')
            );
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setRequests(list);
        } catch (err) {
            console.error("Error fetching requests:", err);
        } finally {
            setFetchingRequests(false);
        }
    };

    const fetchUserDocs = async () => {
        if (view !== 'document_storage') return;
        setFetchingDocs(true);
        try {
            const q = query(collection(db, 'user_documents'), orderBy('uploadDate', 'desc'));
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setUserDocs(list);
        } catch (err) {
            console.error("Error fetching docs:", err);
        } finally {
            setFetchingDocs(false);
        }
    };

    const fetchIssuedCerts = async () => {
        if (view !== 'participant_certificates') return;
        setFetchingCerts(true);
        try {
            const q = query(collection(db, 'certificates'), orderBy('issueDate', 'desc'));
            const snap = await getDocs(q);
            const list = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setIssuedCerts(list);
        } catch (err) {
            console.error("Error fetching certs:", err);
        } finally {
            setFetchingCerts(false);
        }
    };

    fetchStats();
    fetchParticipants();
    fetchRequests();
    fetchUserDocs();
    fetchIssuedCerts();
  }, [profile, view]);

  const handleApprove = async (req: any) => {
      setRecipientName(req.userName);
      setRecipientEmail(req.userEmail);
      setCourseName(req.courseName);
      setActiveRequestId(req.id);
      setView('upload_certificate');
  };

  const handleReject = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!activeRequestId) return;
      setLoading(true);
      try {
          await updateDoc(doc(db, 'certificate_requests', activeRequestId), {
              status: 'rejected',
              rejectionReason
          });
          setIsRejectModalOpen(false);
          setRejectionReason('');
          setActiveRequestId(null);
          setView('requests');
      } catch (err) {
          console.error(err);
      } finally {
          setLoading(false);
      }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) { // Limit to ~800KB for Firestore Base64
        alert("File too large. Please upload documents under 800KB for secure registry storage.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setAttachedFile({
          name: file.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 800000) {
        alert("File too large. Please upload documents under 800KB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setDocFile({
          name: file.name,
          data: reader.result as string
        });
      };
      reader.readAsDataURL(file);
    }
  };

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile || !docFile || !docRecipientId) return;
    setLoading(true);

    try {
      const docRef = await addDoc(collection(db, 'user_documents'), {
        userId: docRecipientId,
        name: docTitle,
        fileName: docFile.name,
        fileUrl: docFile.data,
        type: docType,
        uploadDate: serverTimestamp()
      });

      setLastIssuedId(docRef.id);
      setDocSuccess(true);
      setTimeout(() => {
        setDocSuccess(false);
        setDocTitle('');
        setDocRecipientId('');
        setDocRecipientName('');
        setDocFile(null);
        setView('document_storage');
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    setLoading(true);
    
    const certId = 'ECERT-' + Math.random().toString(36).substring(2, 9).toUpperCase();
    
    try {
      await addDoc(collection(db, 'certificates'), {
        recipientName,
        recipientEmail,
        courseName,
        grade,
        issueDate: serverTimestamp(),
        issuerId: profile.uid,
        issuerName: profile.displayName,
        issuerOrg: profile.organization,
        status: 'active',
        certId,
        signature,
        fileName: attachedFile?.name || null,
        fileUrl: attachedFile?.data || null
      });

      setLastIssuedId(certId);
      // If approved from a request, update request status
      if (activeRequestId) {
          await updateDoc(doc(db, 'certificate_requests', activeRequestId), {
              status: 'issued'
          });
          setActiveRequestId(null);
      }
      
      setSuccess(true);
      // Simulate Email Notification
      console.log(`[Notification] Dispatching certificate ${certId} to ${recipientEmail}`);
      
      setTimeout(() => {
        setSuccess(false);
        setView('participant_certificates');
        setRecipientName('');
        setRecipientEmail('');
        setCourseName('');
        setGrade('');
        setAttachedFile(null);
      }, 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Participant filtering
  const filteredParticipants = participants.filter(p => 
    p.displayName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex min-h-screen bg-[#F5F7FA]">
      {/* Sidebar */}
      <aside className="w-72 bg-white border-r border-border-muted flex flex-col fixed h-full z-20">
        <div className="p-8 border-b border-border-muted flex items-center gap-2">
          <div className="w-10 h-10 bg-primary rounded-xl flex items-center justify-center">
            <ShieldCheck className="text-white" size={24} />
          </div>
          <span className="text-xl font-bold tracking-tighter text-[#1A1F26]">CertiFlow</span>
        </div>

        <nav className="flex-1 p-6 space-y-2 mt-4 text-sm font-bold">
          <button 
            onClick={() => setView('stats')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${view === 'stats' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <LayoutGrid size={20} /> Dashboard
          </button>
          <button 
            onClick={() => setView('participant_certificates')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${view === 'participant_certificates' || view === 'upload_certificate' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Award size={20} /> Participant Certificates
          </button>
          <button 
            onClick={() => setView('document_storage')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${view === 'document_storage' || view === 'upload_document' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <FileIcon size={20} /> Document Storage
          </button>
          <button 
            onClick={() => setView('participants')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${view === 'participants' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Users size={20} /> Participants
          </button>
          <button 
            onClick={() => setView('requests')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${view === 'requests' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <Clock size={20} /> Request Queue
            {requests.filter(r => r.status === 'pending').length > 0 && (
                <span className="ml-auto w-5 h-5 bg-amber-500 text-white text-[10px] rounded-full flex items-center justify-center animate-bounce">
                    {requests.filter(r => r.status === 'pending').length}
                </span>
            )}
          </button>
          <button 
            onClick={() => setView('history')}
            className={`w-full flex items-center gap-4 px-4 py-3 rounded-xl transition-all ${view === 'history' ? 'bg-primary text-white shadow-lg shadow-primary/20' : 'text-neutral-500 hover:bg-neutral-50'}`}
          >
            <ShieldCheck size={20} /> eCert Registry
          </button>
        </nav>

        <div className="p-6 border-t border-border-muted">
           <div className="bg-neutral-50 p-4 rounded-xl mb-4">
              <p className="text-[10px] text-neutral-400 font-bold uppercase mb-1">Organization</p>
              <p className="text-sm font-bold text-[#1A1F26] truncate">{profile?.organization}</p>
           </div>
           <button 
            onClick={logout}
            className="w-full text-xs font-bold text-red-500 uppercase tracking-widest hover:text-red-600 transition-colors"
           >
             Sign Out
           </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 ml-72 p-12">
        {view === 'stats' && (
          <div className="max-w-5xl mx-auto">
            <header className="mb-10">
              <h1 className="text-3xl font-bold text-[#1A1F26] tracking-tight">System Oversight</h1>
              <p className="text-neutral-500">Monitor your issuing activity and credential validity.</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
              <div className="bg-primary p-8 rounded-3xl text-white">
                <Users className="mb-4 opacity-50" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest mb-1 opacity-80">Total Recipients</p>
                <h2 className="text-4xl font-bold">{stats.total}</h2>
              </div>
              <div className="bg-white border border-border-muted p-8 rounded-3xl">
                <CheckCircle className="mb-4 text-green-500" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">Active Licenses</p>
                <h2 className="text-4xl font-bold text-[#1A1F26]">{stats.active}</h2>
              </div>
              <div className="bg-white border border-border-muted p-8 rounded-3xl">
                <AlertCircle className="mb-4 text-amber-500" size={32} />
                <p className="text-xs font-bold uppercase tracking-widest mb-1 text-neutral-400">Monthly Growth</p>
                <h2 className="text-4xl font-bold text-[#1A1F26]">+12%</h2>
              </div>
            </div>

            <div className="bg-white border border-border-muted rounded-3xl overflow-hidden shadow-sm">
                <div className="p-6 border-b border-border-muted flex items-center justify-between">
                    <h3 className="font-bold text-[#1A1F26]">Pending Dispatches</h3>
                    <span className="text-xs font-bold text-primary bg-primary-light px-3 py-1 rounded-full">{requests.filter(r => r.status === 'pending').length} Requests</span>
                </div>
                {requests.filter(r => r.status === 'pending').length > 0 ? (
                    <div className="divide-y divide-neutral-50">
                        {requests.filter(r => r.status === 'pending').slice(0, 3).map((req, i) => (
                            <div key={i} className="p-4 flex items-center justify-between hover:bg-neutral-50 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center">
                                        <Mail size={16} />
                                    </div>
                                    <div>
                                        <p className="text-sm font-bold text-[#1A1F26]">{req.userName}</p>
                                        <p className="text-[10px] text-neutral-400">{req.courseName}</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => handleApprove(req)}
                                    className="text-xs font-bold text-primary hover:underline"
                                >
                                    Review
                                </button>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-[#F5F7FA] rounded-full flex items-center justify-center mx-auto mb-4">
                            <Send className="text-neutral-300" />
                        </div>
                        <p className="text-sm text-neutral-500">All issued records are currently synchronized with the DigiWallet registry.</p>
                    </div>
                )}
            </div>
          </div>
        )}

        {view === 'requests' && (
          <div className="max-w-5xl mx-auto">
             <header className="mb-10">
                <h1 className="text-3xl font-bold text-[#1A1F26] tracking-tight">Request Queue</h1>
                <p className="text-neutral-500 text-sm">Review incoming certificate applications and approve issuance.</p>
             </header>

             <div className="bg-white border border-border-muted rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-border-muted text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5">Application</th>
                                <th className="px-8 py-5">Requested Course</th>
                                <th className="px-8 py-5">Status</th>
                                <th className="px-8 py-5 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {fetchingRequests ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center">
                                        <Loader2 className="animate-spin text-primary inline-block mb-2" />
                                        <p className="text-neutral-400 font-medium">Fetching applications...</p>
                                    </td>
                                </tr>
                            ) : requests.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-8 py-20 text-center italic text-neutral-400">No applications in the registry.</td>
                                </tr>
                            ) : requests.map(req => (
                                <tr key={req.id} className="group hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div>
                                            <p className="font-bold text-[#1A1F26] text-sm">{req.userName}</p>
                                            <p className="text-[10px] text-neutral-400">{req.userEmail}</p>
                                            <p className="text-[10px] text-neutral-400">ID: {req.id.slice(0, 8).toUpperCase()}</p>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <p className="font-medium text-sm text-[#1A1F26]">{req.courseName}</p>
                                        <p className="text-[10px] text-neutral-400 line-clamp-1">{req.notes || 'No notes provided'}</p>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className={`text-[10px] font-bold uppercase px-3 py-1 rounded-full ${
                                            req.status === 'pending' ? 'bg-amber-100 text-amber-600' :
                                            req.status === 'approved' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                                        }`}>{req.status}</span>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        {req.status === 'pending' ? (
                                            <div className="flex justify-end gap-2">
                                                <button 
                                                    onClick={() => { setActiveRequestId(req.id); setIsRejectModalOpen(true); }}
                                                    className="px-4 py-2 border border-red-100 text-red-500 text-xs font-bold rounded-lg hover:bg-red-50 transition-all"
                                                >
                                                    Reject
                                                </button>
                                                <button 
                                                    onClick={() => handleApprove(req)}
                                                    className="px-4 py-2 bg-primary text-white text-xs font-bold rounded-lg hover:bg-primary-dark transition-all shadow-md shadow-primary/10"
                                                >
                                                    Approve & Issue
                                                </button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] font-bold text-neutral-300 uppercase tracking-widest italic">Processed</span>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {view === 'document_storage' && (
          <div className="max-w-5xl mx-auto">
             <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1F26] tracking-tight mb-2">Document Storage</h1>
                    <p className="text-neutral-500 text-sm">View all documents uploaded by users to the registry.</p>
                </div>
                <button
                    onClick={() => setView('upload_document')}
                    className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-dark transition-all"
                >
                    <Plus size={18} /> Upload Document
                </button>
             </header>

             <div className="bg-white border border-border-muted rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-border-muted text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5 tracking-widest">Document</th>
                                <th className="px-8 py-5 tracking-widest">Uploaded By (ID)</th>
                                <th className="px-8 py-5 tracking-widest">Date</th>
                                <th className="px-8 py-5 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {fetchingDocs ? (
                                <tr>
                                   <td colSpan={5} className="px-8 py-12 text-center text-neutral-400">
                                       <Loader2 className="animate-spin mx-auto mb-4" />
                                       Loading documents...
                                   </td>
                                </tr>
                            ) : userDocs.length === 0 ? (
                                <tr>
                                   <td colSpan={5} className="px-8 py-12 text-center text-neutral-400">
                                       <FileIcon className="mx-auto mb-4 opacity-50" size={32} />
                                       No documents uploaded yet.
                                   </td>
                                </tr>
                            ) : (
                                userDocs.map(doc => (
                                    <tr key={doc.id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary">
                                                    <FileIcon size={18} />
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-[#1A1F26]">{doc.name}</p>
                                                    <p className="text-[10px] text-neutral-400">{doc.fileType?.toUpperCase() || 'DOCUMENT'}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-sm text-[#1A1F26]">{doc.userId}</p>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-neutral-500">
                                            {doc.uploadDate?.toDate().toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => alert('View/manage functionality would open the document here.')}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600 font-bold text-xs rounded-xl hover:bg-neutral-200 transition-colors"
                                            >
                                                <BookOpen size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {view === 'participant_certificates' && (
          <div className="max-w-5xl mx-auto">
             <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1F26] tracking-tight mb-2">Participant Certificates</h1>
                    <p className="text-neutral-500 text-sm">View and manage all certificates issued.</p>
                </div>
                <button
                    onClick={() => setView('upload_certificate')}
                    className="bg-primary text-white px-6 py-2 rounded-xl font-bold text-sm shadow-lg shadow-primary/20 flex items-center gap-2 hover:bg-primary-dark transition-all"
                >
                    <Plus size={18} /> Upload Certificate
                </button>
             </header>

             <div className="bg-white border border-border-muted rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-border-muted text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5 tracking-widest">Participant</th>
                                <th className="px-8 py-5 tracking-widest">Certificate</th>
                                <th className="px-8 py-5 tracking-widest">Issue Date</th>
                                <th className="px-8 py-5 tracking-widest w-10">Status</th>
                                <th className="px-8 py-5 tracking-widest text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {fetchingCerts ? (
                                <tr>
                                   <td colSpan={5} className="px-8 py-12 text-center text-neutral-400">
                                       <Loader2 className="animate-spin mx-auto mb-4" />
                                       Loading certificates...
                                   </td>
                                </tr>
                            ) : issuedCerts.length === 0 ? (
                                <tr>
                                   <td colSpan={5} className="px-8 py-12 text-center text-neutral-400">
                                       <Award className="mx-auto mb-4 opacity-50" size={32} />
                                       No certificates issued yet.
                                   </td>
                                </tr>
                            ) : (
                                issuedCerts.map(cert => (
                                    <tr key={cert.id} className="hover:bg-neutral-50/50 transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-4">
                                                <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center text-primary font-bold">
                                                    {cert.recipientName.charAt(0)}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm text-[#1A1F26]">{cert.recipientName}</p>
                                                    <p className="text-xs text-neutral-400">{cert.recipientEmail}</p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="font-bold text-sm text-[#1A1F26]">{cert.courseName}</p>
                                            <p className="text-xs text-neutral-400">ID: {cert.certId}</p>
                                        </td>
                                        <td className="px-8 py-5 text-sm text-neutral-500">
                                            {cert.issueDate?.toDate().toLocaleDateString()}
                                        </td>
                                        <td className="px-8 py-5">
                                           <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${
                                               cert.status === 'active' ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
                                           }`}>
                                               {cert.status}
                                           </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <button 
                                                onClick={() => alert(`View/manage functionality for Certificate: ${cert.certId}`)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-neutral-100 text-neutral-600 font-bold text-xs rounded-xl hover:bg-neutral-200 transition-colors"
                                            >
                                                <BookOpen size={14} /> View
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {view === 'participants' && (
          <div className="max-w-5xl mx-auto">
             <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1F26] tracking-tight">Participant Registry</h1>
                    <p className="text-neutral-500 text-sm">Select a participant to issue credentials or manage their documents.</p>
                </div>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" size={18} />
                    <input 
                        placeholder="Search by name or email..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bg-white border border-border-muted pl-10 pr-4 py-3 rounded-2xl text-sm focus:border-primary outline-none transition-all w-full md:w-80 shadow-sm"
                    />
                </div>
             </header>

             <div className="bg-white border border-border-muted rounded-[2.5rem] overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-neutral-50 border-b border-border-muted text-[10px] font-bold text-neutral-400 uppercase tracking-widest">
                            <tr>
                                <th className="px-8 py-5 tracking-widest">Participant</th>
                                <th className="px-8 py-5 tracking-widest">Digital ID / Email</th>
                                <th className="px-8 py-5 text-right tracking-widest">Registry Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-100">
                            {fetchingParticipants ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center">
                                        <Loader2 className="animate-spin text-primary inline-block mb-4" size={32} />
                                        <p className="text-neutral-400 font-medium">Synchronizing participant records...</p>
                                    </td>
                                </tr>
                            ) : filteredParticipants.length === 0 ? (
                                <tr>
                                    <td colSpan={3} className="px-8 py-20 text-center flex flex-col items-center">
                                        <div className="w-16 h-16 bg-neutral-50 rounded-full flex items-center justify-center mb-4">
                                            <Search className="text-neutral-200" size={32} />
                                        </div>
                                        <p className="text-neutral-400 italic">No participants found matching your criteria.</p>
                                    </td>
                                </tr>
                            ) : filteredParticipants.map(participant => (
                                <tr key={participant.id} className="group hover:bg-neutral-50/50 transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary font-bold text-xs group-hover:scale-110 transition-transform">
                                                {participant.displayName?.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <p className="font-bold text-[#1A1F26] text-sm">{participant.displayName}</p>
                                                <p className="text-[10px] bg-green-50 text-green-600 inline-block px-2 py-0.5 rounded uppercase font-bold tracking-tighter">Verified User</p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-sm text-neutral-500 font-mono">{participant.email}</td>
                                    <td className="px-8 py-6 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button 
                                                onClick={() => {
                                                    setRecipientName(participant.displayName);
                                                    setRecipientEmail(participant.email);
                                                    setView('issue');
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 text-primary text-xs font-bold rounded-xl hover:bg-primary hover:text-white transition-all"
                                            >
                                                Issue Certificate <Award size={14} />
                                            </button>
                                            <button 
                                                onClick={() => {
                                                    setDocRecipientName(participant.displayName);
                                                    setDocRecipientId(participant.id);
                                                    setView('documents');
                                                }}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-green-50 text-green-600 text-xs font-bold rounded-xl hover:bg-green-600 hover:text-white transition-all"
                                            >
                                                Upload Document <FileIcon size={14} />
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
             </div>
          </div>
        )}

        {view === 'upload_certificate' && (
          <div className="max-w-2xl mx-auto">
             <header className="mb-6 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1F26] tracking-tight">Issue Certificate</h1>
                    <p className="text-neutral-500 text-sm">Issue and upload high-integrity digital certificates to user wallets.</p>
                </div>
                <button 
                    onClick={() => setView('participant_certificates')}
                    className="p-2 bg-white border border-border-muted rounded-xl text-neutral-400 hover:text-primary transition-all"
                >
                    <X size={20} />
                </button>
             </header>

             {!success && (
               <div className="flex items-center gap-2 bg-neutral-100 p-1.5 rounded-2xl mb-8">
                  <button 
                    onClick={() => setIssueMode('manual')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${issueMode === 'manual' ? 'bg-white shadow-sm text-[#1A1F26]' : 'text-neutral-500 hover:text-[#1A1F26]'}`}
                  >
                    Manual Issue
                  </button>
                  <button 
                    onClick={() => setIssueMode('design')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${issueMode === 'design' ? 'bg-white shadow-sm text-[#1A1F26]' : 'text-neutral-500 hover:text-[#1A1F26]'}`}
                  >
                    Design Online
                  </button>
                  <button 
                    onClick={() => setIssueMode('api')}
                    className={`flex-1 py-2.5 text-xs font-bold rounded-xl transition-all ${issueMode === 'api' ? 'bg-white shadow-sm text-[#1A1F26]' : 'text-neutral-500 hover:text-[#1A1F26]'}`}
                  >
                    API Generation
                  </button>
               </div>
             )}

             {success ? (
               <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-green-50 border border-green-200 p-12 rounded-3xl text-center"
               >
                 <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-white" size={40} />
                 </div>
                 <h2 className="text-2xl font-bold text-green-900 mb-2">Issuance Successful</h2>
                 <p className="text-green-700 mb-6">The certificate has been dispatched to the recipient's wallet and registry.</p>
                 
                 <div className="bg-white p-6 rounded-2xl border border-green-200 mb-8 inline-block shadow-sm">
                    <QRCodeSVG 
                      value={`${window.location.origin}?verify=${lastIssuedId}`} 
                      size={120} 
                      level="H"
                    />
                    <p className="text-[10px] font-bold mt-2 text-neutral-400 uppercase tracking-widest">Digital Audit Code</p>
                 </div>

                 <div className="flex flex-col items-center gap-3">
                   <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-green-200 rounded-2xl text-green-600 font-bold text-sm shadow-sm animate-pulse">
                      <Mail size={18} /> Notification Email Sent
                   </div>
                   {attachedFile && (
                     <div className="text-[10px] text-green-500 font-bold uppercase tracking-widest flex items-center gap-1">
                       <FileIcon size={12} /> {attachedFile.name} Uploaded
                     </div>
                   )}
                 </div>

                 <button 
                   onClick={() => {
                       setSuccess(false);
                       setRecipientName('');
                       setRecipientEmail('');
                       setCourseName('');
                       setGrade('');
                       setSignature('');
                       setAttachedFile(null);
                       setView('requests');
                   }}
                   className="mt-8 px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                 >
                   Back to Registry
                 </button>
               </motion.div>
             ) : (
               <>
               {issueMode === 'manual' && (
               <form onSubmit={handleIssue} className="space-y-6">
                 <div className="bg-white border border-border-muted p-8 rounded-3xl space-y-6 shadow-sm">
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2"><UserIcon size={12} /> Recipient Name</label>
                            <input 
                                required
                                value={recipientName}
                                onChange={(e) => setRecipientName(e.target.value)}
                                className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm"
                                placeholder="Full Legal Name"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2"><Mail size={12} /> Registry Email</label>
                            <input 
                                required
                                type="email"
                                value={recipientEmail}
                                onChange={(e) => setRecipientEmail(e.target.value)}
                                className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm"
                                placeholder="For wallet sync"
                            />
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2"><BookOpen size={12} /> Course / Event Name</label>
                        <input 
                            required
                            value={courseName}
                            onChange={(e) => setCourseName(e.target.value)}
                            className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm"
                            placeholder="e.g. Full Stack Web Development"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2"><Award size={12} /> Grade / Award (Optional)</label>
                        <input 
                            value={grade}
                            onChange={(e) => setGrade(e.target.value)}
                            className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm"
                            placeholder="e.g. Distinction, Top 1%, etc."
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2"><UploadCloud size={12} /> Document / Certificate File</label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition-all ${attachedFile ? 'border-primary bg-primary/5' : 'border-neutral-200 hover:border-primary/50 bg-[#F5F7FA]'}`}
                        >
                           <input 
                             type="file"
                             hidden
                             ref={fileInputRef}
                             onChange={handleFileChange}
                             accept=".pdf,.jpg,.jpeg,.png"
                           />
                           {attachedFile ? (
                              <div className="flex items-center justify-between">
                                 <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 bg-primary text-white rounded-lg flex items-center justify-center">
                                       <FileIcon size={20} />
                                    </div>
                                    <div className="text-left">
                                       <p className="text-sm font-bold text-[#1A1F26] truncate max-w-[200px]">{attachedFile.name}</p>
                                       <p className="text-[10px] text-primary uppercase font-bold tracking-tight">File Attached</p>
                                    </div>
                                 </div>
                                 <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setAttachedFile(null); }}
                                  className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
                                 >
                                    <XIcon size={18} />
                                 </button>
                              </div>
                           ) : (
                             <div className="flex flex-col items-center gap-2">
                                <UploadCloud className="text-neutral-300" size={32} />
                                <p className="text-sm font-medium text-neutral-500">Drag and drop or <span className="text-primary font-bold">Browse</span></p>
                                <p className="text-[10px] text-neutral-400">PDF, PNG, JPG (Max 800KB)</p>
                             </div>
                           )}
                        </div>
                    </div>

                    <div className="pt-4 border-t border-dashed border-neutral-100 mt-6 overflow-hidden">
                       <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2 mb-4"><PenTool size={12} /> Digital Seal / E-Signature</label>
                       <div className="bg-[#F5F7FA] border-2 border-dashed border-neutral-200 rounded-2xl p-6 relative group overflow-hidden">
                          <input 
                            required
                            value={signature}
                            onChange={(e) => setSignature(e.target.value)}
                            className="w-full bg-transparent font-serif text-2xl text-center italic text-[#1A1F26] placeholder:text-neutral-200 outline-none relative z-10"
                            placeholder="Type Identity to Sign"
                          />
                          <div className="absolute inset-x-0 bottom-0 py-1 bg-primary/5 text-[8px] text-center text-primary font-bold tracking-[0.3em] uppercase opacity-0 group-focus-within:opacity-100 transition-opacity">
                             Secure Hash Interface Active
                          </div>
                       </div>
                       <p className="mt-2 text-[9px] text-neutral-400 text-center uppercase tracking-wider">By typing your name, you are applying a secure cryptographic e-signature to this document.</p>
                    </div>
                 </div>

                 <button 
                  disabled={loading}
                  type="submit"
                  className="w-full bg-primary text-white font-bold py-5 rounded-[2rem] hover:bg-primary-dark transition-all flex items-center justify-center gap-3 shadow-lg shadow-primary/20"
                 >
                   {loading ? (
                     <Loader2 className="animate-spin" />
                   ) : (
                     <>
                        Apply Seal & Issue <Send size={20} />
                     </>
                   )}
                 </button>
               </form>
               )}
                {issueMode === 'design' && (
                  <div className="bg-white border border-border-muted p-8 rounded-3xl text-center shadow-sm">
                    <div className="w-16 h-16 bg-primary/10 mx-auto mb-6 rounded-2xl flex items-center justify-center text-primary">
                        <PenTool size={32} />
                    </div>
                    <h2 className="text-2xl font-bold text-[#1A1F26] mb-3">Online Certificate Designer</h2>
                    <p className="text-neutral-500 mb-8 max-w-md mx-auto">Create beautiful, tamper-proof certificates directly in your browser. Choose a template or start from scratch.</p>
                    <button className="bg-primary text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-primary/20 hover:bg-primary-dark transition-all">
                      Launch Designer Studio
                    </button>
                  </div>
                )}
                {issueMode === 'api' && (
                  <div className="bg-white border border-border-muted p-8 rounded-3xl shadow-sm text-left">
                    <h2 className="text-2xl font-bold text-[#1A1F26] mb-3 flex items-center gap-3"><Code className="text-primary"/> API Integration</h2>
                    <p className="text-neutral-500 mb-8">Automate certificate generation directly from your LMS or ERP system using our secure REST API.</p>
                    <div className="bg-[#1A1F26] rounded-2xl p-6 text-sm text-neutral-300 font-mono mb-6 overflow-x-auto">
                       <p className="text-green-400 mb-2">// POST /api/v1/certificates/issue</p>
                       <p>{'{'}</p>
                       <p className="ml-4">"recipientName": "Jane Doe",</p>
                       <p className="ml-4">"recipientEmail": "jane@example.com",</p>
                       <p className="ml-4">"courseName": "Advanced React Patterns",</p>
                       <p className="ml-4">"issuerId": "{profile?.uid}"</p>
                       <p>{'}'}</p>
                    </div>
                    <div className="flex justify-between items-center bg-[#F5F7FA] p-4 rounded-xl border border-border-muted mb-6">
                       <div>
                          <p className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Your Live API Key</p>
                          <p className="font-mono text-sm mt-1">pk_live_*******************</p>
                       </div>
                       <button className="text-xs font-bold text-primary hover:underline">Reveal Key</button>
                    </div>
                    <button className="w-full bg-neutral-900 text-white px-8 py-3 rounded-xl font-bold transition-all hover:bg-black flex items-center justify-center gap-2">
                      <BookOpen size={18}/> View API Documentation
                    </button>
                  </div>
                )}
                </>
             )}
          </div>
        )}
        {view === 'upload_document' && (
          <div className="max-w-2xl mx-auto">
             <header className="mb-10 flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-[#1A1F26] tracking-tight">Document Upload</h1>
                    <p className="text-neutral-500 text-sm">Seal and upload official documents directly to a user's secure vault.</p>
                </div>
                <button 
                  onClick={() => setView('document_storage')}
                  className="p-2 bg-white border border-border-muted rounded-xl text-neutral-400 hover:text-primary transition-all"
                >
                  <XIcon size={20} />
                </button>
             </header>

             {docSuccess ? (
                <motion.div 
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="bg-green-50 border border-green-200 p-12 rounded-3xl text-center"
                >
                  <div className="w-20 h-20 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <CheckCircle className="text-white" size={40} />
                  </div>
                  <h2 className="text-2xl font-bold text-green-900 mb-2">Upload Successful</h2>
                  <p className="text-green-700 mb-6">The document has been securely synchronized with the recipient's private vault.</p>
                  
                  <div className="bg-white p-6 rounded-2xl border border-green-200 mb-8 inline-block shadow-sm">
                    <QRCodeSVG 
                      value={`${window.location.origin}?verify=${lastIssuedId}`} 
                      size={120} 
                      level="H"
                    />
                    <p className="text-[10px] font-bold mt-2 text-neutral-400 uppercase tracking-widest">Digital Audit Code</p>
                 </div>

                  <div className="flex flex-col items-center gap-3 mb-8">
                     <div className="inline-flex items-center gap-3 px-6 py-3 bg-white border border-green-200 rounded-2xl text-green-600 font-bold text-sm shadow-sm animate-pulse">
                        <Mail size={18} /> Notification Email Sent
                     </div>
                  </div>
                  <button 
                    onClick={() => setDocSuccess(false)}
                    className="px-8 py-3 bg-green-600 text-white rounded-xl font-bold hover:bg-green-700 transition-all shadow-lg shadow-green-200"
                  >
                    Upload Another
                  </button>
                </motion.div>
             ) : (
                <form onSubmit={handleDocumentUpload} className="space-y-6">
                  <div className="bg-white border border-border-muted p-8 rounded-3xl space-y-6 shadow-sm">
                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                         <UserIcon size={12} /> Target Recipient
                       </label>
                       {docRecipientId ? (
                         <div className="flex items-center justify-between p-4 bg-primary/5 border border-primary/20 rounded-xl">
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 bg-primary text-white rounded-lg flex items-center justify-center text-[10px] font-bold">
                                {docRecipientName.charAt(0)}
                              </div>
                              <p className="text-sm font-bold text-primary">{docRecipientName}</p>
                            </div>
                            <button 
                              type="button"
                              onClick={() => { setDocRecipientId(''); setDocRecipientName(''); }}
                              className="text-xs font-bold text-neutral-400 hover:text-red-500"
                            >
                              Change
                            </button>
                         </div>
                       ) : (
                         <div className="p-4 bg-amber-50 border border-amber-100 rounded-xl text-center">
                            <p className="text-xs text-amber-600 font-medium mb-2">Please select a participant from the registry first.</p>
                            <button 
                              type="button"
                              onClick={() => setView('participants')}
                              className="text-xs font-bold text-amber-700 hover:underline"
                            >
                              Go to Participant Registry
                            </button>
                         </div>
                       )}
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2">
                         <FileIcon size={12} /> Document Title
                       </label>
                       <input 
                         required
                         value={docTitle}
                         onChange={(e) => setDocTitle(e.target.value)}
                         className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-primary outline-none transition-all text-sm"
                         placeholder="e.g. Official Semester Transcript"
                       />
                    </div>

                    <div className="space-y-2">
                       <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Document Classification</label>
                       <div className="grid grid-cols-3 gap-2">
                          {['Identity', 'Academic', 'Medical', 'Legal', 'Financial', 'Other'].map(type => (
                            <button 
                              key={type}
                              type="button"
                              onClick={() => setDocType(type)}
                              className={`px-4 py-2 rounded-lg text-[10px] font-bold uppercase tracking-wider border transition-all ${docType === type ? 'bg-primary text-white border-primary transition-all' : 'bg-white border-neutral-100 text-neutral-400 hover:border-primary/30'}`}
                            >
                              {type}
                            </button>
                          ))}
                       </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest flex items-center gap-2"><UploadCloud size={12} /> Secure File Attachment</label>
                        <div 
                          onClick={() => fileInputRef.current?.click()}
                          className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${docFile ? 'border-primary bg-primary/5' : 'border-neutral-200 hover:border-primary/50 bg-[#F5F7FA]'}`}
                        >
                           <input 
                             type="file"
                             hidden
                             ref={fileInputRef}
                             onChange={handleDocFileChange}
                             accept=".pdf,.jpg,.jpeg,.png"
                           />
                           {docFile ? (
                              <div className="flex flex-col items-center gap-2">
                                 <div className="w-12 h-12 bg-primary text-white rounded-xl flex items-center justify-center mb-1">
                                    <FileIcon size={24} />
                                 </div>
                                 <p className="text-sm font-bold text-primary truncate max-w-full">{docFile.name}</p>
                                 <button 
                                  type="button"
                                  onClick={(e) => { e.stopPropagation(); setDocFile(null); }}
                                  className="text-[10px] font-bold text-red-500 uppercase tracking-widest hover:underline"
                                 >
                                    Remove File
                                 </button>
                              </div>
                           ) : (
                              <div className="flex flex-col items-center gap-2">
                                 <UploadCloud className="text-neutral-300" size={40} />
                                 <p className="text-sm font-medium text-neutral-600">Select official file from system</p>
                                 <p className="text-[10px] text-neutral-400">PDF, PNG, JPG (Safe storage up to 800KB)</p>
                              </div>
                           )}
                        </div>
                    </div>
                  </div>

                  <button 
                    disabled={loading || !docFile || !docRecipientId || !docTitle}
                    type="submit"
                    className="w-full bg-[#1A1F26] text-white font-bold py-5 rounded-[2.5rem] hover:bg-black transition-all flex items-center justify-center gap-3 shadow-xl disabled:opacity-50"
                  >
                    {loading ? <Loader2 className="animate-spin" /> : <>Authorize & Upload Document <Send size={20} /></>}
                  </button>
                </form>
             )}
          </div>
        )}

        {view === 'history' && (
          <div className="max-w-4xl mx-auto py-10">
             <header className="mb-10">
                <h1 className="text-3xl font-bold text-[#1A1F26] mb-2 tracking-tight">eCert Public Registry</h1>
                <p className="text-neutral-500">Search and verify any certificate issued through this institution.</p>
             </header>
             <div className="bg-white rounded-3xl border border-border-muted p-2 shadow-sm overflow-hidden">
                <Verify />
             </div>
          </div>
        )}
      </main>

      <AnimatePresence>
        {isRejectModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsRejectModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-md" 
            />
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white w-full max-w-md rounded-[2.5rem] p-10 relative overflow-hidden shadow-2xl"
            >
              <h2 className="text-2xl font-bold text-[#1A1F26] mb-2 flex items-center gap-3 text-red-500">
                <AlertCircle /> Reject Application
              </h2>
              <p className="text-neutral-500 text-sm mb-8">Provide a reason for rejecting this certificate request. The applicant will be notified.</p>

              <form onSubmit={handleReject} className="space-y-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-bold text-neutral-400 uppercase tracking-widest">Rejection Reason</label>
                    <textarea 
                      required
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="e.g. Incomplete documentation, incorrect course selected, etc."
                      rows={4}
                      className="w-full bg-[#F5F7FA] border border-border-muted rounded-xl px-4 py-3 focus:border-red-500 outline-none transition-all text-sm resize-none"
                    />
                 </div>

                 <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => { setIsRejectModalOpen(false); setRejectionReason(''); }}
                      className="flex-1 px-6 py-4 border border-border-muted rounded-2xl font-bold text-neutral-500 hover:bg-neutral-50 transition-all"
                    >
                      Keep Pending
                    </button>
                    <button 
                      disabled={!rejectionReason || loading}
                      type="submit"
                      className="flex-1 px-6 py-4 bg-red-500 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 hover:bg-red-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {loading ? <Loader2 className="animate-spin" size={18} /> : 'Confirm Rejection'}
                    </button>
                 </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function X({ size }: { size: number }) {
  return <path stroke="currentColor" strokeWidth="2" strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />;
}
