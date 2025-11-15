export const metadata = {
  title: 'Collaborative Snake Game',
  description: 'Two snakes working together',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, backgroundColor: '#1a1a1a' }}>{children}</body>
    </html>
  )
}
