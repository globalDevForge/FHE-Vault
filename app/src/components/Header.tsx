import { ConnectButton } from '@rainbow-me/rainbowkit';
import '../styles/Header.css';

export function Header() {
  return (
    <header className="header">
      <div className="header-container">
        <div className="header-content">
          <div className="header-text">
            <h1 className="header-title">FHE Vault</h1>
            <p className="header-subtitle">Stake and withdraw encrypted fUSDT on Sepolia.</p>
          </div>
          <ConnectButton showBalance={false} />
        </div>
      </div>
    </header>
  );
}
