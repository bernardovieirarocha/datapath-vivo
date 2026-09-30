import { useEffect, useState } from 'react';
import { Explorar } from './modes/explorar/Explorar';
import { instrucaoDoHash } from './rota';

/** v0.1: uma tela só. Os outros modos (programa, quiz, falhas, codificação) estão fora do ar. */
export function App() {
  const [inicial, setInicial] = useState(() => instrucaoDoHash(location.hash));
  const [versao, setVersao] = useState(0);
  useEffect(() => {
    // Colar outro link na barra de endereço recarrega a instrução.
    const onHash = () => {
      setInicial(instrucaoDoHash(location.hash));
      setVersao((v) => v + 1);
    };
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return <Explorar key={versao} inicial={inicial} />;
}
