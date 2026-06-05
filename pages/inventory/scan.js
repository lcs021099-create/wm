import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/router';
import Layout from '../../components/Layout';
import { palletsAPI } from '../../lib/api';

export default function ScanPage() {
  const router = useRouter();
  const [step, setStep] = useState('scan'); // scan → form → done
  const [barcode, setBarcode] = useState('');
  const [manualCode, setManualCode] = useState('');
  const [form, setForm] = useState({
    supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '',
    format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '',
    sheets: '', production_date: '', shipment_date: '', origin: '', quality_grade: '',
    quality_notes: '', location: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [scannerReady, setScannerReady] = useState(false);
  const scannerRef = useRef(null);
  const scannerInstanceRef = useRef(null);

  // 初始化掃碼器
  useEffect(() => {
    if (step !== 'scan') return;
    let scanner = null;
    const initScanner = async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        scanner = new Html5Qrcode('scanner-region');
        scannerInstanceRef.current = scanner;
        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 280, height: 120 }, aspectRatio: 1.777 },
          (text) => { handleScan(text); },
          () => {}
        );
        setScannerReady(true);
      } catch (err) {
        console.log('Camera not available:', err);
        setScannerReady(false);
      }
    };
    initScanner();
    return () => {
      if (scanner && scanner.isScanning) scanner.stop().catch(() => {});
    };
  }, [step]);

  const handleScan = async (code) => {
    if (scannerInstanceRef.current?.isScanning) {
      await scannerInstanceRef.current.stop().catch(() => {});
    }
    setBarcode(code);
    // 檢查是否已存在
    try {
      const r = await palletsAPI.getByBarcode(code);
      if (r.data) {
        alert(`此條碼已入庫！板號: ${r.data.pallet_no || '—'}, 紙種: ${r.data.paper_type || '—'}`);
        setStep('scan');
        return;
      }
    } catch {}
    setForm(f => ({ ...f, barcode: code }));
    setStep('form');
  };

  const handleManualEntry = () => {
    if (manualCode.trim()) {
      handleScan(manualCode.trim());
    } else {
      setBarcode('manual-' + Date.now());
      setForm(f => ({ ...f, barcode: '' }));
      setStep('form');
    }
  };

  const setField = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const save = async () => {
    if (!form.paper_type?.trim()) return setError('請填寫紙種');
    setError(''); setSaving(true);
    try {
      await palletsAPI.create({ ...form, barcode: barcode || form.barcode });
      setStep('done');
    } catch (err) {
      setError(err.response?.data?.error || '儲存失敗');
    } finally { setSaving(false); }
  };

  const gradeColors = { A: { bg: '#e8f5ed', border: '#2d8a4e', color: '#2d8a4e' }, B: { bg: '#fef6e8', border: '#d4851a', color: '#d4851a' }, C: { bg: '#fdecea', border: '#c0392b', color: '#c0392b' } };

  // === 掃碼頁 ===
  if (step === 'scan') return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => router.push('/inventory')} style={backBtn}>&larr;</button>
        <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>📷 掃碼入庫</p>
      </div>
      <div style={card}>
        <div id="scanner-region" style={{ width: '100%', borderRadius: 8, overflow: 'hidden', background: '#000', minHeight: 200 }} />
        {!scannerReady && (
          <p style={{ textAlign: 'center', color: '#6c757d', fontSize: 13, marginTop: 10 }}>
            📷 正在啟動相機…<br />如無法啟動，請用手動輸入
          </p>
        )}
      </div>
      <div style={card}>
        <p style={{ fontSize: 13, fontWeight: 600, color: '#495057', marginBottom: 8 }}>或手動輸入條碼</p>
        <div style={{ display: 'flex', gap: 8 }}>
          <input style={{ ...inp, flex: 1, marginBottom: 0 }} placeholder="輸入條碼編號" value={manualCode} onChange={e => setManualCode(e.target.value)} />
          <button onClick={handleManualEntry} style={{ ...primaryBtn, whiteSpace: 'nowrap' }}>確認</button>
        </div>
        <button onClick={() => { setBarcode(''); setStep('form'); }} style={{ width: '100%', marginTop: 10, padding: '10px', background: '#f8f9fa', border: '1px solid #dee2e6', borderRadius: 6, cursor: 'pointer', fontSize: 13, color: '#495057' }}>
          無條碼，直接手動錄入
        </button>
      </div>
    </Layout>
  );

  // === 完成頁 ===
  if (step === 'done') return (
    <Layout>
      <div style={{ textAlign: 'center', padding: '40px 20px' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>&#10003;</div>
        <p style={{ fontSize: 18, fontWeight: 700, color: '#2d8a4e' }}>入庫成功！</p>
        <p style={{ fontSize: 14, color: '#6c757d' }}>{form.paper_type} · {form.pallet_no}</p>
        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 20 }}>
          <button onClick={() => { setStep('scan'); setBarcode(''); setManualCode(''); setForm({ supplier: 'Smurfit Kappa', customer: '', commission_no: '', pallet_no: '', format_size: '', paper_type: '', batch_code: '', caliper: '', weight: '', sheets: '', production_date: '', shipment_date: '', origin: '', quality_grade: '', quality_notes: '', location: '' }); }} style={primaryBtn}>繼續掃碼</button>
          <button onClick={() => router.push('/inventory')} style={{ ...primaryBtn, background: '#6c757d' }}>返回庫存</button>
        </div>
      </div>
    </Layout>
  );

  // === 表單頁 ===
  return (
    <Layout>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
        <button onClick={() => setStep('scan')} style={backBtn}>&larr;</button>
        <p style={{ fontSize: 17, fontWeight: 700, margin: 0 }}>填寫貨品資料</p>
      </div>

      {barcode && <div style={{ ...card, background: '#f8f9fa', padding: '10px 14px', fontSize: 13 }}>條碼: <strong>{barcode}</strong></div>}

      {/* 品質分級 */}
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
        <textarea style={{ ...inp, marginTop: 10, minHeight: 50, marginBottom: 0 }} placeholder="品質備註（可選）…" value={form.quality_notes} onChange={e => setField('quality_notes', e.target.value)} />
      </div>

      {/* 標籤資料 */}
      <div style={card}>
        <div style={sec}>標籤資料</div>
        <div style={grid}>
          <div style={fg}><label style={lbl}>紙種 *</label><input style={inp} placeholder="如 PUZZLE BOARD BLUE PASTED" value={form.paper_type} onChange={e => setField('paper_type', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>板號 Pal.-Nr.</label><input style={inp} placeholder="如 9014/26" value={form.pallet_no} onChange={e => setField('pallet_no', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>訂單編號 Com.-Nr.</label><input style={inp} placeholder="如 349179/1" value={form.commission_no} onChange={e => setField('commission_no', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>批次碼 MaRu</label><input style={inp} placeholder="如 24SK05005" value={form.batch_code} onChange={e => setField('batch_code', e.target.value)} /></div>
        </div>
        <div style={grid}>
          <div style={fg}><label style={lbl}>尺寸 Format</label><input style={inp} placeholder="如 78,7 x 109,2 SB" value={form.format_size} onChange={e => setField('format_size', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>厚度 Caliper (mm)</label><input style={inp} placeholder="如 1,90" value={form.caliper} onChange={e => setField('caliper', e.target.value)} /></div>
        </div>
        <div style={grid}>
          <div style={fg}><label style={lbl}>重量 (kg)</label><input style={inp} placeholder="如 565" value={form.weight} onChange={e => setField('weight', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>張數 Sheets</label><input style={inp} placeholder="如 500" value={form.sheets} onChange={e => setField('sheets', e.target.value)} /></div>
        </div>
      </div>

      <div style={card}>
        <div style={sec}>其他資訊</div>
        <div style={grid}>
          <div style={fg}><label style={lbl}>供應商</label><input style={inp} value={form.supplier} onChange={e => setField('supplier', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>客戶</label><input style={inp} placeholder="如 Wuming, Dongguan" value={form.customer} onChange={e => setField('customer', e.target.value)} /></div>
        </div>
        <div style={grid}>
          <div style={fg}><label style={lbl}>生產日期</label><input style={inp} placeholder="如 03.07.2024" value={form.production_date} onChange={e => setField('production_date', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>出貨日期</label><input style={inp} placeholder="如 15.07.2024" value={form.shipment_date} onChange={e => setField('shipment_date', e.target.value)} /></div>
        </div>
        <div style={grid}>
          <div style={fg}><label style={lbl}>產地</label><input style={inp} placeholder="如 Made in Germany" value={form.origin} onChange={e => setField('origin', e.target.value)} /></div>
          <div style={fg}><label style={lbl}>存放位置</label><input style={inp} placeholder="如 A區-3排" value={form.location} onChange={e => setField('location', e.target.value)} /></div>
        </div>
      </div>

      {error && <p style={{ color: '#c0392b', fontSize: 13, marginBottom: 10 }}>{error}</p>}

      <button onClick={save} disabled={saving} style={{ ...primaryBtn, width: '100%', padding: 14, marginBottom: 20 }}>
        {saving ? '儲存中…' : '確認入庫'}
      </button>
    </Layout>
  );
}

const card = { background: '#fff', borderRadius: 10, border: '0.5px solid #dee2e6', padding: 16, marginBottom: 12 };
const sec = { fontSize: 12, fontWeight: 600, color: '#6c757d', textTransform: 'uppercase', letterSpacing: '.5px', marginBottom: 12, paddingBottom: 6, borderBottom: '0.5px solid #dee2e6' };
const grid = { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px,1fr))', gap: 10, marginBottom: 10 };
const fg = {};
const lbl = { display: 'block', fontSize: 13, fontWeight: 500, color: '#495057', marginBottom: 5 };
const inp = { border: '1px solid #dee2e6', borderRadius: 6, padding: '8px 10px', fontSize: 14, width: '100%', boxSizing: 'border-box' };
const primaryBtn = { padding: '10px 20px', background: '#1a6fdb', color: '#fff', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 14, fontWeight: 600 };
const backBtn = { padding: '6px 12px', border: '1px solid #dee2e6', borderRadius: 6, background: '#fff', cursor: 'pointer', fontSize: 16 };
