import '../styles/globals.css';
import Layout from '../components/layout';
import Head from 'next/head';
import {useEffect} from 'react';
import {supabase} from '../supabase';

function MyApp({Component, pageProps}) {
  useEffect(() => {
    supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        console.log('User signed in');
      } else if (event === 'SIGNED_OUT') {
        console.log('User signed out');
      }
    });
  }, []);

  return (
    <>
      <Head>
        <title>Biblioteca 216 - @caefisica</title>
      </Head>
      <Layout>
        <Component {...pageProps} />
      </Layout>
    </>
  );
}

export default MyApp;
