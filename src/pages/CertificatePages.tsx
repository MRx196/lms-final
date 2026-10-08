import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ShieldCheck, CheckCircle, XCircle, ArrowLeft, Certificate,
  Download, Eye, UserCircle, BookOpen, Prohibit, Trash, Medal
} from '@phosphor-icons/react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ROUTES } from '@/constants/navigation';
import * as AssessmentService from '@/services/assessmentService';
import { toast } from 'sonner';

/* ─── Public Certificate Verification Page ─── */
export function CertificateVerifyPage() {
  const { code } = useParams<{ code: string }>();
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [manualCode, setManualCode] = useState(code || '');

  useEffect(() => {
    if (code) verify(code);
  }, [code]);

  async function verify(certCode: string) {
    setLoading(true);
    try {
      const data = await AssessmentService.verifyCertificate(certCode);
      setResult(data);
    } catch {
      setResult(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div initial="hidden" animate="visible" className="max-w-2xl mx-auto space-y-6">
      <Link to={ROUTES.home}>
        <Button size="sm" variant="ghost" className="gap-1 mb-4"><ArrowLeft size={14} /> Back to Home</Button>
      </Link>

      <div className="text-center">
        <ShieldCheck size={48} className="mx-auto text-emerald-600 mb-4" />
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Verify Certificate</h1>
        <p className="text-sm text-zinc-500 mt-1">Enter a certificate code to verify its authenticity</p>
      </div>

      {/* Manual lookup */}
      <Card className="border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-6">
          <div className="flex gap-2">
            <Input value={manualCode} onChange={e => setManualCode(e.target.value)} placeholder="Enter certificate code..." className="flex-1" />
            <Button onClick={() => verify(manualCode)} disabled={loading || !manualCode.trim()} className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2">
              <Eye size={16} /> Verify
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Verified result */}
      {result && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-200 dark:border-emerald-800 overflow-hidden">
            <div className="bg-gradient-to-r from-emerald-500 to-teal-500 h-2" />
            <CardContent className="p-8 text-center">
              <div className="w-20 h-20 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={40} weight="bold" className="text-emerald-600" />
              </div>
              <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0 mb-4">Verified ✓</Badge>
              <h2 className="text-xl font-bold text-zinc-900 dark:text-white mb-1">{result.course?.title}</h2>
              <p className="text-sm text-zinc-500 mb-6">Certificate of Completion</p>

              <div className="grid grid-cols-2 gap-4 text-left max-w-md mx-auto">
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Recipient</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-1">
                    <UserCircle size={14} /> {result.user?.full_name || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Course</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white flex items-center gap-1">
                    <BookOpen size={14} /> {result.course?.title || 'N/A'}
                  </p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Certificate Code</p>
                  <p className="text-sm font-mono text-zinc-900 dark:text-white break-all">{result.certificate_code}</p>
                </div>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 rounded-lg">
                  <p className="text-xs text-zinc-400 mb-1">Issued</p>
                  <p className="text-sm font-medium text-zinc-900 dark:text-white">{result.issued_at ? new Date(result.issued_at).toLocaleDateString() : 'N/A'}</p>
                </div>
              </div>

              <div className="flex gap-3 justify-center mt-6">
                <Button variant="outline" className="gap-2"><Download size={16} /> Download PDF</Button>
                <Button variant="outline" className="gap-2"><Eye size={16} /> View Details</Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Not found / revoked */}
      {manualCode && !result && !loading && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-red-200 dark:border-red-900/50">
            <CardContent className="p-8 text-center">
              <XCircle size={48} className="mx-auto text-red-500 mb-4" />
              <h3 className="font-semibold text-zinc-900 dark:text-white mb-2">Certificate Not Found</h3>
              <p className="text-sm text-zinc-500">This certificate code could not be verified. It may be invalid or has been revoked.</p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {loading && (
        <div className="text-center py-8">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm text-zinc-500 mt-3">Verifying certificate...</p>
        </div>
      )}
    </motion.div>
  );
}

/* ─── Admin Certificates Management Page ─── */
export function AdminCertificatesPage() {
  const [certs, setCerts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    async function load() {
      try {
        const data = await AssessmentService.getAllCertificates();
        setCerts(data);
      } catch (err: any) { toast.error(err.message || 'Failed to load certificates'); }
      finally { setLoading(false); }
    }
    load();
  }, []);

  const filtered = certs.filter(c =>
    c.user?.full_name?.toLowerCase().includes(search.toLowerCase()) ||
    c.course?.title?.toLowerCase().includes(search.toLowerCase()) ||
    c.certificate_code.toLowerCase().includes(search.toLowerCase())
  );

  const handleRevoke = async (id: string) => {
    if (!confirm('Revoke this certificate?')) return;
    try {
      await AssessmentService.revokeCertificate(id);
      toast.success('Certificate revoked');
      window.location.reload();
    } catch (err: any) { toast.error(err.message || 'Failed to revoke'); }
  };

  if (loading) return <div className="space-y-4">{[0,1,2].map(i => <div key={i} className="h-20 bg-zinc-100 dark:bg-zinc-800 rounded-xl animate-pulse" />)}</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-white">Certificates</h1>
          <p className="text-sm text-zinc-500 mt-1">{certs.length} total certificates issued</p>
        </div>
      </div>

      <div className="relative max-w-sm">
        <Eye size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search certificates..." className="pl-9" />
      </div>

      {filtered.length === 0 ? (
        <Card className="border-dashed border-zinc-300 dark:border-zinc-700"><CardContent className="p-10 text-center">
          <Medal size={48} className="mx-auto text-zinc-300 mb-4" />
          <h3 className="font-semibold text-zinc-900 dark:text-white mb-1">No certificates found</h3>
          <p className="text-sm text-zinc-500">No certificates have been issued yet.</p>
        </CardContent></Card>
      ) : (
        <div className="space-y-3">
          {filtered.map(cert => (
            <Card key={cert.id} className={`border-zinc-200 dark:border-zinc-800 ${cert.revoked ? 'opacity-50' : ''}`}>
              <CardContent className="p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-emerald-100 to-amber-100 dark:from-emerald-900/30 dark:to-amber-900/30 flex items-center justify-center shrink-0">
                  <Medal size={20} className="text-emerald-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="font-medium text-sm text-zinc-900 dark:text-white truncate">{cert.user?.full_name || 'Unknown'}</h3>
                  <p className="text-xs text-zinc-500">{cert.course?.title || 'Unknown course'}</p>
                  <p className="text-[10px] text-zinc-400 font-mono mt-0.5">{cert.certificate_code}</p>
                </div>
                <div className="text-right shrink-0 space-x-2">
                  <span className="text-xs text-zinc-400">{cert.issued_at ? new Date(cert.issued_at).toLocaleDateString() : ''}</span>
                  {cert.revoked ? (
                    <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 border-0">Revoked</Badge>
                  ) : (
                    <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 border-0">Active</Badge>
                  )}
                  {!cert.revoked && (
                    <button onClick={() => handleRevoke(cert.id)} className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-zinc-400 hover:text-red-600 transition-colors">
                      <Trash size={16} />
                    </button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}