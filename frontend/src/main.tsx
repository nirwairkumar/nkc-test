import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'katex/dist/katex.min.css';
import 'katex/dist/contrib/mhchem'; // Enable \ce{} and \pu{} for chemistry

createRoot(document.getElementById("root")!).render(<App />);
