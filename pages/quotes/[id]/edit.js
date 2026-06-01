import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import QuoteForm from './new';
import { quotesAPI } from '../../lib/api';
import Layout from '../../components/Layout';

export default function EditQuote() {
  const router = useRouter();
  const { id } = router.query;
  const [quote, setQuote] = useState(null);

  useEffect(() => {
    if (!id) return;
    quotesAPI.get(id).then(r => setQuote(r.data)).catch(() => router.push('/quotes'));
  }, [id]);

  if (!quote) return <Layout><p style={{ textAlign: 'center', padding: 40, color: '#6c757d' }}>載入中…</p></Layout>;
  return <QuoteForm quote={quote} />;
}
