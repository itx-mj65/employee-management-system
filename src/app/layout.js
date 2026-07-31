import { Montserrat, Poppins } from 'next/font/google';
import './globals.css';
import ThemeProvider from '@/providers/ThemeProvider';
import QueryProvider from '@/providers/QueryProvider';
import { AuthProvider } from '@/providers/AuthProvider';
import { Toaster } from 'react-hot-toast';
import TopLoader from '@/components/shared/TopLoader';

const montserrat = Montserrat({ variable: '--font-montserrat', subsets: ['latin'], weight: ['300', '400', '500', '600', '700'] });
const poppins = Poppins({ variable: '--font-poppins', subsets: ['latin'], weight: ['400', '500', '600', '700'] });

export const metadata = {
  title: 'EMS — Med Billing RCM',
  description: 'Employee Management System — Med Billing RCM',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${montserrat.variable} ${poppins.variable} font-sans`} style={{ fontFamily: 'var(--font-montserrat), system-ui, sans-serif' }}>
        <ThemeProvider>
          <QueryProvider>
            <AuthProvider>
              <TopLoader />
              {children}
              <Toaster
                position="top-right"
                toastOptions={{
                  duration: 3000,
                  style: {
                    background: 'var(--card)',
                    color: 'var(--card-foreground)',
                    border: '1px solid var(--border)',
                    fontSize: '13px',
                  },
                }}
              />
            </AuthProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
