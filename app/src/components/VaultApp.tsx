import { useMemo, useState, type FormEvent } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Contract } from 'ethers';
import { formatUnits, parseUnits } from 'viem';

import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { useZamaInstance } from '../hooks/useZamaInstance';
import {
  FHE_VAULT_ABI,
  FHE_VAULT_ADDRESS,
  FUSDT_ABI,
  FUSDT_ADDRESS,
  MAX_UINT64,
  TOKEN_DECIMALS,
} from '../config/contracts';

import '../styles/VaultApp.css';

const ZERO_BYTES32 =
  '0x0000000000000000000000000000000000000000000000000000000000000000';

type Status = {
  type: 'success' | 'error' | 'info';
  message: string;
};

const formatToken = (value: bigint | null) =>
  value === null ? '0' : formatUnits(value, TOKEN_DECIMALS);

const toBigInt = (value: string | number | bigint | undefined) => {
  if (value === undefined) {
    return null;
  }

  if (typeof value === 'bigint') {
    return value;
  }

  const normalized = value.toString();
  if (!normalized) {
    return null;
  }

  try {
    return BigInt(normalized);
  } catch (error) {
    console.error('Failed to cast value to bigint', error);
    return null;
  }
};

export function VaultApp() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const signerPromise = useEthersSigner();
  const { instance: zama, isLoading: zamaLoading, error: zamaError } = useZamaInstance();
  const queryClient = useQueryClient();

  const [mintInput, setMintInput] = useState('10');
  const [stakeInput, setStakeInput] = useState('1');
  const [withdrawInput, setWithdrawInput] = useState('1');
  const [status, setStatus] = useState<Status | null>(null);
  const [pendingAction, setPendingAction] = useState<
    'mint' | 'stake' | 'withdraw' | 'authorize' | null
  >(null);

  const isConnected = Boolean(address);

  const vaultStateQuery = useQuery({
    queryKey: ['vault-state', address],
    enabled: Boolean(publicClient),
    refetchInterval: 15000,
    queryFn: async () => {
      if (!publicClient) {
        throw new Error('Public client unavailable');
      }

      const [totalStaked, totalStakedCipher, vaultBalanceCipher] = await Promise.all([
        publicClient.readContract({
          address: FHE_VAULT_ADDRESS,
          abi: FHE_VAULT_ABI,
          functionName: 'getTotalStaked',
        }) as Promise<bigint>,
        publicClient.readContract({
          address: FHE_VAULT_ADDRESS,
          abi: FHE_VAULT_ABI,
          functionName: 'getTotalStakedCipher',
        }) as Promise<string>,
        publicClient.readContract({
          address: FHE_VAULT_ADDRESS,
          abi: FHE_VAULT_ABI,
          functionName: 'getVaultBalanceCipher',
        }) as Promise<string>,
      ]);

      let user = {
        stake: 0n,
        stakeCipher: ZERO_BYTES32,
        isOperator: false,
        tokenBalanceCipher: ZERO_BYTES32,
      };

      if (address) {
        const [stake, stakeCipher, isOperator, tokenBalanceCipher] = await Promise.all([
          publicClient.readContract({
            address: FHE_VAULT_ADDRESS,
            abi: FHE_VAULT_ABI,
            functionName: 'getStake',
            args: [address as `0x${string}`],
          }) as Promise<bigint>,
          publicClient.readContract({
            address: FHE_VAULT_ADDRESS,
            abi: FHE_VAULT_ABI,
            functionName: 'getStakeCipher',
            args: [address as `0x${string}`],
          }) as Promise<string>,
          publicClient.readContract({
            address: FHE_VAULT_ADDRESS,
            abi: FHE_VAULT_ABI,
            functionName: 'isVaultOperator',
            args: [address as `0x${string}`],
          }) as Promise<boolean>,
          publicClient.readContract({
            address: FUSDT_ADDRESS,
            abi: FUSDT_ABI,
            functionName: 'confidentialBalanceOf',
            args: [address as `0x${string}`],
          }) as Promise<string>,
        ]);

        user = {
          stake,
          stakeCipher,
          isOperator,
          tokenBalanceCipher,
        };
      }

      return {
        totalStaked,
        totalStakedCipher,
        vaultBalanceCipher,
        user,
      };
    },
  });

  const decryptQuery = useQuery({
    queryKey: [
      'decrypt-balances',
      address,
      vaultStateQuery.data?.user.stakeCipher,
      vaultStateQuery.data?.user.tokenBalanceCipher,
      vaultStateQuery.data?.vaultBalanceCipher,
    ],
    enabled:
      Boolean(address && zama && signerPromise && vaultStateQuery.data) &&
      Boolean(
        vaultStateQuery.data &&
          (vaultStateQuery.data.user.stakeCipher !== ZERO_BYTES32 ||
            vaultStateQuery.data.user.tokenBalanceCipher !== ZERO_BYTES32 ||
            vaultStateQuery.data.vaultBalanceCipher !== ZERO_BYTES32),
      ),
    staleTime: 30000,
    queryFn: async () => {
      if (!address || !zama || !signerPromise || !vaultStateQuery.data) {
        return null;
      }

      const signer = await signerPromise;
      if (!signer) {
        throw new Error('Connect your wallet to decrypt values');
      }

      const handlePairs: Array<{ handle: string; contractAddress: string }> = [];

      if (vaultStateQuery.data.user.stakeCipher !== ZERO_BYTES32) {
        handlePairs.push({
          handle: vaultStateQuery.data.user.stakeCipher,
          contractAddress: FHE_VAULT_ADDRESS,
        });
      }

      if (vaultStateQuery.data.user.tokenBalanceCipher !== ZERO_BYTES32) {
        handlePairs.push({
          handle: vaultStateQuery.data.user.tokenBalanceCipher,
          contractAddress: FUSDT_ADDRESS,
        });
      }

      if (vaultStateQuery.data.vaultBalanceCipher !== ZERO_BYTES32) {
        handlePairs.push({
          handle: vaultStateQuery.data.vaultBalanceCipher,
          contractAddress: FUSDT_ADDRESS,
        });
      }

      if (handlePairs.length === 0) {
        return {
          stake: '0',
          walletBalance: '0',
          vaultBalance: '0',
        };
      }

      const uniqueContracts = Array.from(
        new Set(handlePairs.map((item) => item.contractAddress)),
      );

      const keypair = zama.generateKeypair();
      const startTimestamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '7';
      const eip712 = zama.createEIP712(
        keypair.publicKey,
        uniqueContracts,
        startTimestamp,
        durationDays,
      );

      const signature = await signer.signTypedData(
        eip712.domain,
        {
          UserDecryptRequestVerification:
            eip712.types.UserDecryptRequestVerification,
        },
        eip712.message,
      );

      const result = await zama.userDecrypt(
        handlePairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        uniqueContracts,
        address,
        startTimestamp,
        durationDays,
      );

      return {
        stake: result[vaultStateQuery.data.user.stakeCipher] || '0',
        walletBalance:
          result[vaultStateQuery.data.user.tokenBalanceCipher] || '0',
        vaultBalance:
          result[vaultStateQuery.data.vaultBalanceCipher] || '0',
      };
    },
  });

  const decryptedStake = useMemo(
    () => (decryptQuery.data ? toBigInt(decryptQuery.data.stake) : null),
    [decryptQuery.data],
  );

  const decryptedWalletBalance = useMemo(
    () => (decryptQuery.data ? toBigInt(decryptQuery.data.walletBalance) : null),
    [decryptQuery.data],
  );

  const decryptedVaultBalance = useMemo(
    () => (decryptQuery.data ? toBigInt(decryptQuery.data.vaultBalance) : null),
    [decryptQuery.data],
  );

  const stateError = vaultStateQuery.isError
    ? (vaultStateQuery.error as Error)
    : null;

  const decryptError = decryptQuery.isError
    ? (decryptQuery.error as Error)
    : null;

  const plainStake = vaultStateQuery.data?.user.stake ?? 0n;
  const totalStaked = vaultStateQuery.data?.totalStaked ?? 0n;

  const operatorGranted = vaultStateQuery.data?.user.isOperator ?? false;

  const showDecryptHint =
    isConnected && !zamaLoading && zamaError && operatorGranted;

  const updateQueries = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ['vault-state'] }),
      queryClient.invalidateQueries({ queryKey: ['decrypt-balances'] }),
    ]);
  };

  const ensurePositiveAmount = (value: string, action: string) => {
    if (!value || !value.trim()) {
      throw new Error(`Enter an amount to ${action}.`);
    }

    const parsed = parseUnits(value, TOKEN_DECIMALS);

    if (parsed <= 0n) {
      throw new Error('Amount must be greater than zero.');
    }

    if (parsed > MAX_UINT64) {
      throw new Error('Amount exceeds the uint64 maximum supported by the vault.');
    }

    return parsed;
  };

  const ensureSigner = async () => {
    const signer = await signerPromise;
    if (!signer) {
      throw new Error('Connect your wallet to perform this action.');
    }

    return signer;
  };

  const handleMint = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isConnected) {
      setStatus({ type: 'error', message: 'Connect your wallet to mint test tokens.' });
      return;
    }

    try {
      setPendingAction('mint');
      setStatus({ type: 'info', message: 'Confirm the mint transaction in your wallet.' });

      const amount = ensurePositiveAmount(mintInput, 'mint');
      const signer = await ensureSigner();

      const token = new Contract(FUSDT_ADDRESS, FUSDT_ABI, signer);
      const tx = await token.mint(address, amount);
      await tx.wait();

      setStatus({ type: 'success', message: 'Mint completed successfully.' });
      await updateQueries();
    } catch (error) {
      console.error('Mint failed', error);
      setStatus({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Mint transaction failed.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleAuthorize = async () => {
    if (!isConnected) {
      setStatus({ type: 'error', message: 'Connect your wallet to authorize the vault.' });
      return;
    }

    try {
      setPendingAction('authorize');
      setStatus({
        type: 'info',
        message: 'Approve the authorization request in your wallet.',
      });

      const signer = await ensureSigner();
      const token = new Contract(FUSDT_ADDRESS, FUSDT_ABI, signer);
      const expiry = Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30;
      const tx = await token.setOperator(FHE_VAULT_ADDRESS, expiry);
      await tx.wait();

      setStatus({ type: 'success', message: 'Vault authorization granted.' });
      await updateQueries();
    } catch (error) {
      console.error('Authorization failed', error);
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Authorization transaction failed.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleStake = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isConnected) {
      setStatus({ type: 'error', message: 'Connect your wallet to stake tokens.' });
      return;
    }

    try {
      setPendingAction('stake');
      setStatus({ type: 'info', message: 'Confirm the stake transaction in your wallet.' });

      const amount = ensurePositiveAmount(stakeInput, 'stake');
      const signer = await ensureSigner();
      const vault = new Contract(FHE_VAULT_ADDRESS, FHE_VAULT_ABI, signer);

      const tx = await vault.stake(amount);
      await tx.wait();

      setStatus({ type: 'success', message: 'Stake completed successfully.' });
      await updateQueries();
    } catch (error) {
      console.error('Stake failed', error);
      setStatus({
        type: 'error',
        message:
          error instanceof Error ? error.message : 'Stake transaction failed.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const handleWithdraw = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!isConnected) {
      setStatus({ type: 'error', message: 'Connect your wallet to withdraw tokens.' });
      return;
    }

    try {
      setPendingAction('withdraw');
      setStatus({
        type: 'info',
        message: 'Confirm the withdraw transaction in your wallet.',
      });

      const amount = ensurePositiveAmount(withdrawInput, 'withdraw');

      if (amount > plainStake) {
        throw new Error('Withdraw amount exceeds your staked balance.');
      }

      const signer = await ensureSigner();
      const vault = new Contract(FHE_VAULT_ADDRESS, FHE_VAULT_ABI, signer);

      const tx = await vault.withdraw(amount);
      await tx.wait();

      setStatus({ type: 'success', message: 'Withdraw completed successfully.' });
      await updateQueries();
    } catch (error) {
      console.error('Withdraw failed', error);
      setStatus({
        type: 'error',
        message:
          error instanceof Error
            ? error.message
            : 'Withdraw transaction failed.',
      });
    } finally {
      setPendingAction(null);
    }
  };

  const operatorStatusLabel = operatorGranted
    ? 'Vault is authorized to move your fUSDT.'
    : 'Vault has not been authorized yet.';

  return (
    <div className="vault-app">
      <Header />

      <main className="vault-main">
        {status && (
          <div className={`status-banner status-${status.type}`}>
            {status.message}
          </div>
        )}

        {stateError && (
          <div className="status-banner status-error">
            Failed to load vault state: {stateError.message}
          </div>
        )}

        {decryptError && (
          <div className="status-banner status-info">
            Unable to decrypt balances: {decryptError.message}
          </div>
        )}

        <section className="section-card">
          <div className="section-header">
            <h2>Vault Overview</h2>
            <p className="section-subtitle">
              Mint confidential fUSDT, authorize the vault, and manage your encrypted stake.
            </p>
          </div>

          <div className="stat-grid">
            <div className="stat-item">
              <span className="stat-label">Wallet Balance</span>
              <span className="stat-value">
                {decryptedWalletBalance !== null
                  ? `${formatToken(decryptedWalletBalance)} fUSDT`
                  : zamaLoading
                    ? 'Decrypting...'
                    : isConnected
                      ? 'Encrypted — authorize to decrypt'
                      : 'Connect wallet'}
              </span>
              <span className="stat-hint">Encrypted balance fetched from the ERC7984 token.</span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Your Staked Amount</span>
              <span className="stat-value">{`${formatToken(plainStake)} fUSDT`}</span>
              <span className="stat-hint">
                {decryptedStake !== null
                  ? `Decrypted confirmation: ${formatToken(decryptedStake)} fUSDT`
                  : 'Stake decrypts once the relayer is authorized.'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Total Vault Liquidity</span>
              <span className="stat-value">{`${formatToken(totalStaked)} fUSDT`}</span>
              <span className="stat-hint">
                {decryptedVaultBalance !== null
                  ? `Encrypted vault balance: ${formatToken(decryptedVaultBalance)} fUSDT`
                  : 'The vault balance remains encrypted until decrypted by an operator.'}
              </span>
            </div>
            <div className="stat-item">
              <span className="stat-label">Vault Operator Status</span>
              <span className={`operator-badge ${operatorGranted ? 'granted' : 'missing'}`}>
                {operatorGranted ? 'Authorized' : 'Not Authorized'}
              </span>
              <span className="stat-hint">{operatorStatusLabel}</span>
            </div>
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <h2>Mint fUSDT</h2>
            <p className="section-subtitle">
              Mint confidential test tokens directly to your wallet before staking them in the vault.
            </p>
          </div>

          <form className="action-form" onSubmit={handleMint}>
            <label className="input-label" htmlFor="mint-amount">
              Amount to mint
            </label>
            <input
              id="mint-amount"
              type="text"
              value={mintInput}
              onChange={(event) => setMintInput(event.target.value)}
              placeholder="e.g. 25.5"
              className="text-input"
            />
            <button
              type="submit"
              className="primary-button"
              disabled={pendingAction === 'mint'}
            >
              {pendingAction === 'mint' ? 'Minting...' : 'Mint fUSDT'}
            </button>
          </form>
        </section>

        <section className="section-card">
          <div className="section-header">
            <h2>Authorize Vault Transfers</h2>
            <p className="section-subtitle">
              The vault needs operator permission to move your encrypted balance when you stake.
            </p>
          </div>

          <div className="authorize-panel">
            <p className="panel-text">
              Grant the vault operator permission for the next 30 days. You can re-run this at any time to extend access.
            </p>
            <button
              type="button"
              className="secondary-button"
              onClick={handleAuthorize}
              disabled={pendingAction === 'authorize'}
            >
              {pendingAction === 'authorize' ? 'Authorizing...' : 'Authorize Vault'}
            </button>
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <h2>Stake & Withdraw</h2>
            <p className="section-subtitle">
              Lock your fUSDT in the vault and withdraw whenever you need liquidity again.
            </p>
          </div>

          <div className="action-grid">
            <form className="action-form" onSubmit={handleStake}>
              <label className="input-label" htmlFor="stake-amount">
                Amount to stake
              </label>
              <input
                id="stake-amount"
                type="text"
                value={stakeInput}
                onChange={(event) => setStakeInput(event.target.value)}
                placeholder="e.g. 5"
                className="text-input"
              />
              <button
                type="submit"
                className="primary-button"
                disabled={pendingAction === 'stake'}
              >
                {pendingAction === 'stake' ? 'Staking...' : 'Stake'}
              </button>
            </form>

            <form className="action-form" onSubmit={handleWithdraw}>
              <label className="input-label" htmlFor="withdraw-amount">
                Amount to withdraw
              </label>
              <input
                id="withdraw-amount"
                type="text"
                value={withdrawInput}
                onChange={(event) => setWithdrawInput(event.target.value)}
                placeholder="e.g. 2"
                className="text-input"
              />
              <button
                type="submit"
                className="secondary-button"
                disabled={pendingAction === 'withdraw'}
              >
                {pendingAction === 'withdraw' ? 'Withdrawing...' : 'Withdraw'}
              </button>
            </form>
          </div>
        </section>

        <section className="section-card">
          <div className="section-header">
            <h2>Encryption Service Status</h2>
            <p className="section-subtitle">
              All staking records stay encrypted. Use the Zama relayer to decrypt the values you own.
            </p>
          </div>

          <ul className="status-list">
            <li>
              <span className="status-dot ready" />
              Wallet connection: {isConnected ? 'Connected' : 'Not connected'}
            </li>
            <li>
              <span className={`status-dot ${zamaLoading ? 'loading' : zamaError ? 'error' : 'ready'}`} />
              Zama relayer: {zamaLoading ? 'Loading…' : zamaError ? 'Unavailable' : 'Ready'}
            </li>
            <li>
              <span className={`status-dot ${operatorGranted ? 'ready' : 'error'}`} />
              Vault operator: {operatorGranted ? 'Authorized' : 'Needs authorization'}
            </li>
          </ul>

          {zamaError && (
            <p className="error-text">
              {showDecryptHint
                ? 'Relayer initialization failed. Refresh the page to retry decryption.'
                : 'Relayer initialization failed. Connect your wallet to retry.'}
            </p>
          )}
        </section>
      </main>
    </div>
  );
}
