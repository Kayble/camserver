import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-black text-white flex flex-col justify-between p-4 font-sans select-none">
      {/* Header */}
      <header className="w-full max-w-md mx-auto pt-8 pb-4 text-center">
        <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-emerald-400">
          CamServer
        </span>
        <h1 className="text-2xl font-bold text-zinc-100 mt-1">
          Central de Controle
        </h1>
        <p className="text-xs text-zinc-400 mt-1">
          Selecione como deseja utilizar este dispositivo
        </p>
      </header>

      {/* Opções Principais */}
      <div className="w-full max-w-md mx-auto flex flex-col gap-4 my-auto">
        {/* Card: Usar como Câmera */}
        <Link
          href="/camera-v2"
          className="group flex items-center justify-between rounded-3xl border border-zinc-800/80 bg-zinc-950 p-5 transition-all active:scale-[0.98] hover:border-emerald-500/40 hover:bg-zinc-900/80"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 transition-colors group-hover:bg-emerald-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
                <circle cx="12" cy="13" r="3" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                Usar como Câmera
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Transforma este dispositivo em transmissor
              </p>
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-emerald-400"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>

        {/* Card: Administrador */}
        <Link
          href="/admin"
          className="group flex items-center justify-between rounded-3xl border border-zinc-800/80 bg-zinc-950 p-5 transition-all active:scale-[0.98] hover:border-indigo-500/40 hover:bg-zinc-900/80"
        >
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-indigo-500/20 bg-indigo-500/10 text-indigo-400 transition-colors group-hover:bg-indigo-500/20">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <rect width="7" height="9" x="3" y="3" rx="1" />
                <rect width="7" height="5" x="14" y="3" rx="1" />
                <rect width="7" height="9" x="14" y="12" rx="1" />
                <rect width="7" height="5" x="3" y="16" rx="1" />
              </svg>
            </div>
            <div>
              <h2 className="text-base font-semibold text-zinc-100">
                Administrador
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Painel de monitoramento e configurações
              </p>
            </div>
          </div>
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-zinc-600 transition-transform group-hover:translate-x-1 group-hover:text-indigo-400"
          >
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto pb-4 text-center">
        <p className="text-[11px] text-zinc-600 font-mono">
          CamServer • Conexão Criptografada
        </p>
      </footer>
    </main>
  );
}