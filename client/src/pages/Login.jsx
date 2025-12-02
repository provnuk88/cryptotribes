import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

function Login() {
  const navigate = useNavigate();
  const { connectWallet, login, register, isLoading, error, clearError } = useAuthStore();
  const [walletAddress, setWalletAddress] = useState(null);
  const [isRegistering, setIsRegistering] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [step, setStep] = useState('connect'); // connect, authenticate, register

  const handleConnectWallet = async () => {
    clearError();
    const address = await connectWallet();
    if (address) {
      setWalletAddress(address);
      setStep('authenticate');
    }
  };

  const handleLogin = async () => {
    clearError();
    try {
      await login(walletAddress);
      navigate('/dashboard');
    } catch (err) {
      // Check if user needs to register
      if (err.response?.status === 404) {
        setIsRegistering(true);
        setStep('register');
      }
    }
  };

  const handleRegister = async () => {
    clearError();
    if (!displayName.trim()) {
      return;
    }
    try {
      await register(walletAddress, displayName);
      navigate('/dashboard');
    } catch (err) {
      // Error is handled by store
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-secondary-900 via-secondary-800 to-secondary-900">
      {/* Background effects */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-600/10 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-accent-600/10 rounded-full blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-md px-6">
        {/* Logo/Title */}
        <div className="text-center mb-8">
          <h1 className="text-5xl font-display font-bold text-white mb-2 text-shadow-lg">
            CryptoTribes
          </h1>
          <p className="text-secondary-400 text-lg">
            Season 1 - The Awakening
          </p>
        </div>

        {/* Card */}
        <div className="card">
          <div className="card-header text-center">
            <h2 className="text-xl">
              {step === 'connect' && 'Connect Your Wallet'}
              {step === 'authenticate' && 'Sign to Authenticate'}
              {step === 'register' && 'Create Your Commander'}
            </h2>
          </div>

          <div className="card-body space-y-6">
            {/* Error display */}
            {error && (
              <div className="p-3 bg-danger/20 border border-danger/30 rounded-lg text-danger text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Connect Wallet */}
            {step === 'connect' && (
              <div className="space-y-4">
                <p className="text-secondary-400 text-center">
                  Connect your MetaMask wallet to enter the battlefield
                </p>
                <button
                  onClick={handleConnectWallet}
                  disabled={isLoading}
                  className="btn-gold w-full py-3 text-lg flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black" />
                  ) : (
                    <>
                      <svg className="w-6 h-6" viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M35.8328 5L21.5078 15.8283L24.1678 9.51L35.8328 5Z" fill="#E17726"/>
                        <path d="M4.16797 5L18.3596 15.9283L15.833 9.51L4.16797 5Z" fill="#E27625"/>
                      </svg>
                      Connect MetaMask
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Step 2: Authenticate */}
            {step === 'authenticate' && !isRegistering && (
              <div className="space-y-4">
                <div className="p-3 bg-secondary-700 rounded-lg">
                  <p className="text-xs text-secondary-400 mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm text-white break-all">
                    {walletAddress}
                  </p>
                </div>
                <p className="text-secondary-400 text-center text-sm">
                  Sign the message in your wallet to verify ownership
                </p>
                <button
                  onClick={handleLogin}
                  disabled={isLoading}
                  className="btn-primary w-full py-3"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white mx-auto" />
                  ) : (
                    'Sign & Enter'
                  )}
                </button>
                <button
                  onClick={() => {
                    setStep('connect');
                    setWalletAddress(null);
                  }}
                  className="btn-secondary w-full"
                >
                  Use Different Wallet
                </button>
              </div>
            )}

            {/* Step 3: Register */}
            {step === 'register' && (
              <div className="space-y-4">
                <div className="p-3 bg-secondary-700 rounded-lg">
                  <p className="text-xs text-secondary-400 mb-1">Connected Wallet</p>
                  <p className="font-mono text-sm text-white break-all">
                    {walletAddress}
                  </p>
                </div>
                <div>
                  <label className="label">Commander Name</label>
                  <input
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your battle name"
                    className="input"
                    maxLength={20}
                  />
                  <p className="text-xs text-secondary-500 mt-1">
                    3-20 characters, alphanumeric and underscores only
                  </p>
                </div>
                <button
                  onClick={handleRegister}
                  disabled={isLoading || !displayName.trim()}
                  className="btn-gold w-full py-3"
                >
                  {isLoading ? (
                    <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-black mx-auto" />
                  ) : (
                    'Create Commander & Enter'
                  )}
                </button>
                <button
                  onClick={() => {
                    setStep('connect');
                    setWalletAddress(null);
                    setIsRegistering(false);
                  }}
                  className="btn-secondary w-full"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Footer info */}
        <div className="mt-6 text-center text-secondary-500 text-sm">
          <p>Win territories. Earn VP. Claim real prizes.</p>
          <p className="mt-1">$5,000 Prize Pool</p>
        </div>
      </div>
    </div>
  );
}

export default Login;
