export default function HomePage() {
  return (
    <main style={{ maxWidth: '800px', margin: '0 auto' }}>
      <h1 style={{ color: '#00d2ff', fontSize: '2rem', marginBottom: '1rem' }}>
        🥛 Dairy Management System Cloud Backend
      </h1>
      <p style={{ color: '#94a3b8', lineHeight: '1.6', fontSize: '1.1rem' }}>
        Next.js App Router API service powering Neon PostgreSQL online sync, S3-compatible cloud
        WAL backups, and Meta WhatsApp Cloud API automated monthly billing.
      </p>

      <div style={{ marginTop: '2rem', padding: '1.5rem', background: '#0b1437', borderRadius: '12px', border: '1px solid #1e293b' }}>
        <h2 style={{ fontSize: '1.25rem', marginBottom: '0.75rem', color: '#38bdf8' }}>Available API Endpoints</h2>
        <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem', fontFamily: 'monospace' }}>
          <li><strong style={{ color: '#4ade80' }}>GET</strong> /api/health - Health check and service status</li>
          <li><strong style={{ color: '#60a5fa' }}>POST</strong> /api/auth - Secure client device authentication</li>
          <li><strong style={{ color: '#60a5fa' }}>POST</strong> /api/sync - Bidirectional SQLite to Neon database synchronization</li>
          <li><strong style={{ color: '#60a5fa' }}>POST</strong> /api/backup - Upload SQLite snapshot & WAL to S3 storage</li>
          <li><strong style={{ color: '#4ade80' }}>GET</strong> /api/backup/history - View cloud backup history & metadata</li>
          <li><strong style={{ color: '#60a5fa' }}>POST</strong> /api/backup/restore - Download and restore verified backup</li>
          <li><strong style={{ color: '#4ade80' }}>GET</strong> /api/whatsapp/status - Meta Cloud API connection status</li>
          <li><strong style={{ color: '#60a5fa' }}>POST</strong> /api/whatsapp/media - Upload bill media image to Meta</li>
          <li><strong style={{ color: '#60a5fa' }}>POST</strong> /api/whatsapp/send-bill - Send bill to single customer</li>
          <li><strong style={{ color: '#60a5fa' }}>POST</strong> /api/whatsapp/send-monthly-bills - Rate-limited batch sending queue</li>
          <li><strong style={{ color: '#fbbf24' }}>GET/POST</strong> /api/webhooks/whatsapp - Meta webhook verification & delivery events</li>
        </ul>
      </div>
    </main>
  );
}
