export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', padding: '2rem', background: '#030712', color: '#f8fafc' }}>
        {children}
      </body>
    </html>
  );
}
