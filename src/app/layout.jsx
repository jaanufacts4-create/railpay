import './globals.css';

export const metadata = {
  title: 'RailPay OBHS',
  description: 'Railway OBHS contractor payroll — trip-based salary management',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
