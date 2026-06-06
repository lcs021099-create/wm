import { useState, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { palletsAPI } from '../../lib/api';

const compressImage = (file) => new Promise((resolve) => {
  const img = new Image();
  img.src = URL.createObjectURL(file);
  img.onload = () => {
    const canvas = document.createElement('canvas');
    const max = 1600;
    const ratio = Math.min(max / img.width, max / img.height, 1);
    canvas.width = Math.round(img.width * ratio);
    canvas.height = Math.round(img.height * ratio);
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    resolve({ dataUrl, base64: dataUrl.split(',')[1] });
  };
});

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState('photos'); // photos → form → done
  const [pendingPhotos, setPendingPhotos] = useState([]);
  const [ocrLoading, setOcrLoading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState([]);
  const [form, setForm] = useState({
    supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '',
    format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '',
    sheets: '', production_date: '', shipment_date: '', quality_grade: '', quality_notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const photoRef = useRef(null);
  const galleryRef = useRef(null);

  const handleAddPhotos = async (e) => {
    const files = Array.from(e.target.files);
    e.target.value = '';
    if (!files.length) return;
    const compressed = await Promise.all(files.map(compressImage));
    setPendingPhotos((p) => [...p, ...compressed]);
  };

  const handleBatchOCR = async () => {
    if (!pendingPhotos.length) return;
    setOcrLoading(true);
    setProgress({ current: 0, total: pendingPhotos.length });
    const res = [];
    for (let i = 0; i < pendingPhotos.length; i++) {
      setProgress({ current: i + 1, total: pendingPhotos.length });
      try {
        const r = await fetch('/api/ocr-label', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ image: pendingPhotos[i].base64, mediaType: 'image/jpeg' }),
        });
        const data = await r.json();
        if (data.error) throw new Error(data.error);
        await palletsAPI.create({ ...data, supplier: data.supplier || 'Smurfit Kappa' });
        res.push({ success: true, data });
      } catch (err) {
        res.push({ success: false, error: err.message });
      }
    }
    setResults(res);
    setOcrLoading(false);
    setStep('done');
  };

  const save = async () => {
    if (!form.paper_type?.trim()) return setError('請填寫紙種');
    setError(''); setSaving(true);
    try {
      await palletsAPI.create({ ...form });
      setStep('done');
      setResults([{ success: true, data: form }]);
    } catch (err) {
      setError(err.response?.data?.error || '儲存失敗');
    } finally { setSaving(false); }
  };

  const reset = () => {
    setPendingPhotos([]); setResults([]);
    setForm({ supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '', format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '', sheets: '', production_date: '', shipment_date: '', quality_grade: '', quality_notes: '' });
    setStep('photos');
  };

  const gradeColors = { A: { bg: '#e8f5ed', border: '#2d8a4e', color: '#2d8a4e' }, B: { bg: '#fef6e8', border: '#d4851a', color: '#d4851a' }, C: { bg: '#fdecea', border: '#c0392b', color: '#c0392b' } };
  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  // === 完成頁 ===
  if (step === 'done') return (
    <Layout>
      <div style={{ padding: '20px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: 56, marginBottom: 8 }}>✓</div>
          <p style={{ fontSize: 18, fontWeight: 700, color: '#2d8a4e' }}>入庫完成！</p>
          <p style={{ fontSize: 14, color: '#666' }}>
            成功 {results.filter(r => r.success).length} 板
            {results.filter(r => !r.success).length > 0 && ` · 失敗 ${results.filter(r => !r.success).length} 張`}
          </p>
        </div>
        {results.map((r, i) => (
          <div key={i} style={{ padding: '10px 14px', marginBottom: 8, borderRadius: 10, background: r.success ? '#e8f5ed' : '#fdecea', fontSize: 13 }}>
            {r.success
              ? <><span style={{ color: '#2d8a4e', fontWeight: 700 }}>✓ </span>{r.data.paper_type || '未知紙種'} · {r.data.pallet_no || '—'} · {r.data.weight ? r.data.weight + 'kg' : ''}</>
              : <><span style={{ color: '#c0392b', fontWeight: 700 }}>✗ 第{i+1}張失敗：</span>{r.error}</>}
          </div>
        ))}
        <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
          <button onClick={reset} style={{ ...primaryBtn, flex: 1 }}>繼續入庫</button>
          <button onClick={() => router.push('/inventory')} style={{ ...primaryBtn, flex: 1, background: '#6c757d' }}>返回庫存</button>
        </div>
      </div>
    </Layout>
  );

  // === 手動填寫頁 ===
  if (step === 'form') return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => setStep('photos')} style={backBtn}>&larr;</button>
        <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>填寫貨品資料</p>
      </div>

      <div style={card}>
        <div style={sec}>品質分級</div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['A', 'B', 'C'].map(g => {
            const c = gradeColors[g]; const on = form.quality_grade === g;
            return (
              <button key={g} onClick={() => setField('quality_grade', on ? '' : g)}
                style={{ flex: 1, padding: '14px 8px', border: `2px solid ${on ? c.border : '#dee2e6'}`, borderRadius: 10, background: on ? c.bg : '#fff', cursor: 'pointer', textAlign: 'center' }}>
                <div style={{ fontSize: 24, fontWeight: 700, color: on ? c.color : '#adb5bd' }}>{g}</div>
                <div style={{ fontSize: 11, color: on ? c.color : '#adb5bd', marginTop: 2 }}>
                  {{ A: '優良', B: '正常', C: '次品' }[g]}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      <div style={card}>
        <div style={sec}>標籤資料</div>
        <div style={grid}>
          <div><label style={lbl}>紙種 *</label><input style={inp} placeholder="如 PUZZLE BOARD BLUE PASTED" value={form.paper_type} onChange={e => setField('paper_type', e.target.value)} /></div>
          <div><label style={lbl}>板號 Pal.-Nr.</label><input style={inp} placeholder="如 9014/26" value={form.pallet_no} onChange={e => setField('pallet_no', e.target.value)} /></div>
          <div><label style={lbl}>訂單編號 Com.-Nr.</label><input style={inp} placeholder="如 349179/1" value={form.commission_no} onChange={e => setField('commission_no', e.target.value)} /></div>
          <div><label style={lbl}>批次碼 MaRu</label><input style={inp} placeholder="如 24SK05005" value={form.batch_code} onChange={e => setField('batch_code', e.target.value)} /></div>
        </div>
        <div style={grid}>
          <div><label style={lbl}>尺寸 Format</label><input style={inp} placeholder="如 78,7 x 109,2 SB" value={form.format_size} onChange={e => setField('format_size', e.target.value)} /></div>
          <div><label style={lbl}>厚度 Caliper (mm)</label><input style={inp} placeholder="如 1,90" value={form.caliper} onChange={e => setField('caliper', e.target.value)} /></div>
        </div>
        <div style={grid}>
          <div><label style={lbl}>重量 (kg)</label><input style={inp} placeholder="如 565" value={form.weight} onChange={e => setField('weight', e.target.value)} /></div>
          <div><label style={lbl}>張數 Sheets</label><input style={inp} placeholder="如 500" value={form.sheets} onChange={e => setField('sheets', e.target.value)} /></div>
        </div>
        <div style={grid}>
          <div><label style={lbl}>生產日期</label><input style={inp} placeholder="如 03.07.2024" value={form.production_date} onChange={e => setField('production_date', e.target.value)} /></div>
          <div><label style={lbl}>出貨日期</label><input style={inp} placeholder="如 15.07.2024" value={form.shipment_date} onChange={e => setField('shipment_date', e.target.value)} /></div>
        </div>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{error}</p>}
      <button onClick={save} disabled={saving} style={{ ...primaryBtn, width: '100%', padding: 14, marginBottom: 20 }}>
        {saving ? '儲存中…' : '確認入庫'}
      </button>
    </Layout>
  );

  // === 拍照頁 ===
  return (
    <Layout>
      <input ref={photoRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleAddPhotos} />
      <input ref={galleryRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleAddPhotos} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => router.push('/inventory')} style={backBtn}>&larr;</button>
        <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📦 拍照入庫</p>
      </div>

      <div style={card}>
        {pendingPhotos.length > 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 12 }}>
            {pendingPhotos.map((photo, i) => (
              <div key={i} style={{ position: 'relative' }}>
                <img src={photo.dataUrl} style={{ width: '100%', aspectRatio: '1', objectFit: 'cover', borderRadius: 8, display: 'block' }} alt={`標籤${i+1}`} />
                <button onClick={() => setPendingPhotos(p => p.filter((_, idx) => idx !== i))}
                  style={{ position: 'absolute', top: 3, right: 3, background: 'rgba(0,0,0,.65)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, fontSize: 13, cursor: 'pointer', lineHeight: '22px', padding: 0 }}>×</button>
              </div>
            ))}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '28px 0', color: '#bbb' }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>📷</div>
            <p style={{ fontSize: 14 }}>還未新增標籤照片</p>
          </div>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => photoRef.current?.click()} disabled={ocrLoading}
            style={{ flex: 1, padding: '12px', background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            📸 拍照
          </button>
          <button onClick={() => galleryRef.current?.click()} disabled={ocrLoading}
            style={{ flex: 1, padding: '12px', background: '#fff', color: '#1a6fdb', border: '1.5px solid #1a6fdb', borderRadius: 8, cursor: 'pointer', fontSize: 14, fontWeight: 600 }}>
            🖼️ 圖庫
          </button>
        </div>
      </div>

      {pendingPhotos.length > 0 && (
        <button onClick={handleBatchOCR} disabled={ocrLoading}
          style={{ width: '100%', padding: '14px', background: ocrLoading ? '#b0bec5' : '#00acc1', color: '#fff', border: 'none', borderRadius: 8, cursor: ocrLoading ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 700, marginBottom: 10 }}>
          {ocrLoading
            ? `⏳ 識別中 ${progress.current} / ${progress.total} 張…`
            : `🚀 開始識別並入庫（${pendingPhotos.length} 張）`}
        </button>
      )}

      <button onClick={() => setStep('form')}
        style={{ width: '100%', padding: 11, background: '#f6f7fb', border: '1.5px solid #e0e0e0', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#666' }}>
        ✏️ 手動填寫
      </button>
    </Layout>
  );
}

const card = { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: 16, marginBottom: 12 };
const sec = { fontSize: 12, fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12, paddingBottom: 6, borderBottom: '0.5px solid #dee2e6' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 10 };
const lbl = { display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 5 };
const inp = { border: '1px solid #dee2e6', borderRadius: 6, padding: '8px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn = { padding: '10px 20px', background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const backBtn = { padding: '6px 12px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16 };
