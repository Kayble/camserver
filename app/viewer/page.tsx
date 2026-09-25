"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

type BatteryState = {
    supported: boolean;
    level?: number;
    charging?: boolean;
};

export default function ViewerPage() {
    const router = useRouter();

    const containerRef = useRef<HTMLDivElement>(null);
    const remoteVideoRef = useRef<HTMLVideoElement>(null);
    const peerRef = useRef<any>(null);
    const dataConnectionRef = useRef<any>(null);

    const [targetId, setTargetId] = useState("");
    const [cameraName, setCameraName] = useState("Câmera");
    const [status, setStatus] = useState("Aguardando conexão...");
    const [isConnected, setIsConnected] = useState(false);
    const [errorMsg, setErrorMsg] = useState("");
    const [isLandscape, setIsLandscape] = useState(false);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const [copied, setCopied] = useState(false);

    // Inicia mudo para respeitar a política de Autoplay dos navegadores
    const [isMuted, setIsMuted] = useState(true);
    const [isTorchOn, setIsTorchOn] = useState(false);
    const [isRinging, setIsRinging] = useState(false);

    const [battery, setBattery] = useState<BatteryState>({
        supported: false,
    });

    /*
     * Cria um stream fictício contendo VÍDEO (Canvas) e ÁUDIO (Silent AudioContext)
     * para garantir que a negociação SDP inclua a recepção de ambos os canais.
     */
    const createDummyStream = () => {
        const canvas = document.createElement("canvas");
        canvas.width = 1;
        canvas.height = 1;
        const stream = canvas.captureStream();

        try {
            const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
            if (AudioContextClass) {
                const audioCtx = new AudioContextClass();
                const oscillator = audioCtx.createOscillator();
                const dst = audioCtx.createMediaStreamDestination();
                oscillator.connect(dst);
                oscillator.start();

                const audioTrack = dst.stream.getAudioTracks()[0];
                if (audioTrack) {
                    audioTrack.enabled = false;
                    stream.addTrack(audioTrack);
                }
            }
        } catch (e) {
            console.warn("Não foi possível gerar a faixa de áudio fictícia:", e);
        }

        return stream;
    };

    function setupBatteryConnection(peer: any, peerId: string) {
        const dataConnection = peer.connect(peerId);
        dataConnectionRef.current = dataConnection;

        dataConnection.on("open", () => {
            console.log("Canal de telemetria e comandos conectado");
        });

        dataConnection.on("data", (data: any) => {
            if (data?.type !== "battery") return;

            if (!data.supported) {
                setBattery({ supported: false });
                return;
            }

            setBattery({
                supported: true,
                level: typeof data.level === "number" ? data.level : undefined,
                charging: data.charging === true,
            });
        });

        dataConnection.on("close", () => {
            console.log("Canal de telemetria encerrado");
        });

        dataConnection.on("error", (error: any) => {
            console.error("Erro na telemetria:", error);
        });
    }

    async function connectToCamera(peerId: string) {
        if (!peerId.trim()) {
            setErrorMsg("Nenhum Peer ID foi informado.");
            return;
        }

        setErrorMsg("");
        setStatus("Inicializando conexão...");
        setIsConnected(false);

        try {
            const { Peer } = await import("peerjs");

            if (peerRef.current) {
                try {
                    peerRef.current.destroy();
                } catch { }
            }

            const peer = new Peer();
            peerRef.current = peer;

            peer.on("open", () => {
                setStatus("Conectando à câmera...");

                const dummyStream = createDummyStream();
                const call = peer.call(peerId, dummyStream);

                setupBatteryConnection(peer, peerId);

                if (!call) {
                    setErrorMsg("Não foi possível iniciar a chamada.");
                    setStatus("Falha na chamada");
                    return;
                }

                if (call.peerConnection) {
                    call.peerConnection.oniceconnectionstatechange = () => {
                        const state = call.peerConnection.iceConnectionState;

                        if (state === "connected" || state === "completed") {
                            setStatus("Conectando vídeo e áudio...");
                        }

                        if (state === "failed" || state === "disconnected") {
                            setErrorMsg("Falha na conexão com a câmera.");
                            setStatus("Falha na conexão");
                            setIsConnected(false);
                        }
                    };
                }

                call.on("stream", (remoteStream: MediaStream) => {
                    console.log("Stream de áudio e vídeo recebido com sucesso.");
                    setStatus("Transmissão ao vivo");
                    setIsConnected(true);

                    if (remoteVideoRef.current) {
                        remoteVideoRef.current.srcObject = remoteStream;
                        remoteVideoRef.current.muted = true;

                        remoteVideoRef.current.play().then(() => {
                            console.log("Autoplay iniciado em modo mudo.");
                        }).catch((err) => {
                            console.warn("Erro ao reproduzir o vídeo:", err);
                        });
                    }
                });

                call.on("close", () => {
                    setStatus("Transmissão encerrada");
                    setIsConnected(false);
                });

                call.on("error", (err: any) => {
                    console.error("Erro chamada:", err);
                    setErrorMsg(`Erro: ${err.message || err}`);
                    setStatus("Falha na chamada");
                    setIsConnected(false);
                });
            });

            peer.on("error", (err: any) => {
                console.error("Erro PeerJS:", err);
                if (err.type === "peer-unavailable") {
                    setErrorMsg("A câmera não está disponível.");
                } else {
                    setErrorMsg(`Erro: ${err.type || err.message}`);
                }
                setStatus("Erro ao conectar");
                setIsConnected(false);
            });
        } catch (err: any) {
            console.error("Erro:", err);
            setErrorMsg(err?.message || "Erro ao conectar.");
            setStatus("Falha");
            setIsConnected(false);
        }
    }

    useEffect(() => {
        const params = new URLSearchParams(window.location.search);
        const peerId = params.get("peer");
        const name = params.get("name");

        if (name) setCameraName(name);

        if (!peerId) {
            setStatus("Nenhuma câmera selecionada.");
            setErrorMsg("Nenhum Peer ID foi informado.");
            return;
        }

        setTargetId(peerId);
        connectToCamera(peerId);

        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };

        document.addEventListener("fullscreenchange", handleFullscreenChange);

        return () => {
            document.removeEventListener("fullscreenchange", handleFullscreenChange);
            if (dataConnectionRef.current) {
                try { dataConnectionRef.current.close(); } catch { }
            }
            if (peerRef.current) {
                try { peerRef.current.destroy(); } catch { }
            }
        };
    }, []);

    function toggleFullscreen() {
        if (!document.fullscreenElement) {
            if (containerRef.current?.requestFullscreen) {
                containerRef.current.requestFullscreen().catch((err) => {
                    console.error("Erro ao entrar em tela cheia:", err);
                });
            } else if ((remoteVideoRef.current as any)?.webkitEnterFullscreen) {
                (remoteVideoRef.current as any).webkitEnterFullscreen();
            }
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch((err) => {
                    console.error("Erro ao sair da tela cheia:", err);
                });
            }
        }
    }

    function toggleOrientation() {
        setIsLandscape((current) => !current);
    }

    function toggleMute() {
        if (remoteVideoRef.current) {
            const nextMutedState = !isMuted;
            remoteVideoRef.current.muted = nextMutedState;
            setIsMuted(nextMutedState);

            if (!nextMutedState) {
                remoteVideoRef.current.play().catch((err) => {
                    console.error("Erro ao ativar o som via gesto do usuário:", err);
                });
            }
        }
    }

    function toggleTorch() {
        if (dataConnectionRef.current && dataConnectionRef.current.open) {
            const nextTorchState = !isTorchOn;
            dataConnectionRef.current.send({
                type: "toggle-torch",
                enabled: nextTorchState,
            });
            setIsTorchOn(nextTorchState);
        } else {
            setErrorMsg("Canal de comandos com a câmera indisponível.");
        }
    }

    function playCameraSound() {
        if (dataConnectionRef.current && dataConnectionRef.current.open) {
            dataConnectionRef.current.send({
                type: "play-sound",
            });
            setIsRinging(true);
            setTimeout(() => setIsRinging(false), 1200);
        } else {
            setErrorMsg("Canal de comandos com a câmera indisponível.");
        }
    }

    function copyTargetIdToClipboard() {
        if (!targetId) return;

        navigator.clipboard.writeText(targetId).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }).catch((err) => {
            console.error("Erro ao copiar Peer ID:", err);
        });
    }

    function takeScreenshot() {
        const video = remoteVideoRef.current;
        if (!video || !video.videoWidth || !video.videoHeight) {
            setErrorMsg("A transmissão ainda não está disponível.");
            return;
        }

        const canvas = document.createElement("canvas");
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

        const context = canvas.getContext("2d");
        if (!context) {
            setErrorMsg("Não foi possível capturar a imagem.");
            return;
        }

        context.drawImage(video, 0, 0, canvas.width, canvas.height);

        canvas.toBlob((blob) => {
            if (!blob) {
                setErrorMsg("Não foi possível gerar o print.");
                return;
            }

            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;

            const safeName = cameraName.replace(/[^a-z0-9À-ÿ\s-_]/gi, "").trim().replace(/\s+/g, "-");
            const date = new Date().toISOString().replace(/[:.]/g, "-");

            link.download = `${safeName || "camera"}-${date}.png`;
            document.body.appendChild(link);
            link.click();
            link.remove();
            URL.revokeObjectURL(url);
        }, "image/png");
    }

    const batteryColor =
        battery.level !== undefined && battery.level <= 15
            ? "text-red-400"
            : battery.level !== undefined && battery.level <= 30
                ? "text-yellow-400"
                : "text-zinc-300";

    return (
        <main ref={containerRef} className="fixed inset-0 overflow-hidden bg-black text-white">
            {/* APP HEADER */}
            <header className="absolute left-0 right-0 top-0 z-40 border-b border-white/5 bg-black/80 backdrop-blur-xl">
                <div className="flex h-16 items-center gap-3 px-4">
                    <button
                        type="button"
                        onClick={() => router.push("/admin")}
                        aria-label="Voltar para administração"
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/5 text-zinc-300 transition active:scale-95 hover:bg-white/10 hover:text-white"
                    >
                        <BackIcon />
                    </button>

                    <div className="min-w-0 flex-1">
                        <h1 className="truncate text-sm font-semibold">
                            {cameraName}
                        </h1>

                        <div className="mt-0.5 flex items-center gap-1.5">
                            <span
                                className={`h-1.5 w-1.5 rounded-full ${isConnected
                                    ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.8)]"
                                    : "bg-zinc-600"
                                    }`}
                            />
                            <span className="truncate text-[10px] text-zinc-500">
                                {isConnected ? "Ao vivo" : status}
                            </span>
                        </div>
                    </div>

                    {battery.supported && battery.level !== undefined && (
                        <div className={`flex shrink-0 items-center gap-1.5 rounded-lg bg-white/5 px-2.5 py-2 ${batteryColor}`}>
                            {battery.charging ? (
                                <BatteryChargingIcon />
                            ) : (
                                <BatteryIcon level={battery.level} />
                            )}
                            <span className="text-xs font-semibold">
                                {battery.level}%
                            </span>
                        </div>
                    )}
                </div>
            </header>

            {/* VIDEO */}
            <div className="absolute inset-0 flex items-center justify-center bg-black">
                <video
                    ref={remoteVideoRef}
                    autoPlay
                    playsInline
                    className={
                        isLandscape
                            ? "h-full w-full object-contain"
                            : "max-h-full w-full object-contain"
                    }
                />

                {!isConnected && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black">
                        <div className="mb-4 h-8 w-8 animate-spin rounded-full border-2 border-zinc-800 border-t-indigo-500" />
                        <p className="text-sm text-zinc-400">Conectando...</p>
                        <p className="mt-1 max-w-[240px] truncate text-xs text-zinc-600">
                            {cameraName}
                        </p>
                    </div>
                )}

                {isConnected && isMuted && (
                    <button
                        onClick={toggleMute}
                        className="absolute top-20 z-30 flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/20 px-4 py-2 text-xs font-semibold text-indigo-300 backdrop-blur-md transition active:scale-95"
                    >
                        <VolumeMuteIcon />
                        Clique para ativar o áudio
                    </button>
                )}

                {errorMsg && (
                    <div className="absolute bottom-28 left-4 right-4 z-30 mx-auto max-w-md rounded-xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-center text-xs text-red-300 backdrop-blur-xl">
                        {errorMsg}
                    </div>
                )}
            </div>

            {/* LIVE STATUS */}
            {isConnected && (
                <div className="absolute bottom-24 left-4 z-30 flex items-center gap-2 rounded-full border border-white/10 bg-black/60 px-3 py-1.5 backdrop-blur-xl">
                    <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                    <span className="text-[10px] font-medium tracking-wide text-zinc-300">
                        AO VIVO
                    </span>
                </div>
            )}

            {/* BOTTOM CONTROLS */}
            <div className="absolute bottom-0 left-0 right-0 z-40 border-t border-white/5 bg-black/90 px-4 pb-[env(safe-area-inset-bottom)] pt-3 backdrop-blur-xl">
                <div className="mx-auto flex max-w-md items-center justify-center gap-2">
                    {/* Print */}
                    <button
                        type="button"
                        onClick={takeScreenshot}
                        disabled={!isConnected}
                        aria-label="Capturar imagem"
                        className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-zinc-300 transition active:scale-90 hover:bg-white/10 hover:text-white disabled:cursor-not-allowed disabled:opacity-30"
                    >
                        <CameraIcon />
                    </button>

                    {/* Mute/Unmute Áudio */}
                    <button
                        type="button"
                        onClick={toggleMute}
                        disabled={!isConnected}
                        aria-label={isMuted ? "Ativar som" : "Desativar som"}
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 ${isMuted
                            ? "border-red-500/30 bg-red-500/10 text-red-400"
                            : "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            }`}
                    >
                        {isMuted ? <VolumeMuteIcon /> : <VolumeOnIcon />}
                    </button>

                    {/* Lanterna / Flash */}
                    <button
                        type="button"
                        onClick={toggleTorch}
                        disabled={!isConnected}
                        aria-label={isTorchOn ? "Desligar lanterna" : "Ligar lanterna"}
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 ${isTorchOn
                            ? "border-amber-500/50 bg-amber-500/20 text-amber-300 shadow-[0_0_12px_rgba(245,158,11,0.3)]"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        <TorchIcon isOn={isTorchOn} />
                    </button>

                    {/* Chamada Sonora para Pets */}
                    <button
                        type="button"
                        onClick={playCameraSound}
                        disabled={!isConnected}
                        aria-label="Tocar som na câmera"
                        title="Atrair atenção das gatinhas"
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition active:scale-90 disabled:cursor-not-allowed disabled:opacity-30 ${isRinging
                            ? "border-purple-500/50 bg-purple-500/20 text-purple-300 shadow-[0_0_12px_rgba(168,85,247,0.4)] animate-bounce"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        <PetCallIcon />
                    </button>

                    {/* Tela Cheia */}
                    <button
                        type="button"
                        onClick={toggleFullscreen}
                        aria-label={isFullscreen ? "Sair da tela cheia" : "Entrar em tela cheia"}
                        className={`flex h-12 w-12 items-center justify-center rounded-2xl border transition active:scale-90 ${isFullscreen
                            ? "border-indigo-500/50 bg-indigo-500/20 text-indigo-300"
                            : "border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10 hover:text-white"
                            }`}
                    >
                        {isFullscreen ? <MinimizeIcon /> : <MaximizeIcon />}
                    </button>

                    {/* Orientação */}
                    <button
                        type="button"
                        onClick={toggleOrientation}
                        aria-label={isLandscape ? "Usar orientação vertical" : "Usar orientação horizontal"}
                        className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-950/40 transition active:scale-90 hover:bg-indigo-500"
                    >
                        {isLandscape ? <PortraitIcon /> : <LandscapeIcon />}
                    </button>
                </div>

                <div className="mt-2 flex items-center justify-center gap-2">
                    <span className="font-mono text-[9px] text-zinc-600">{targetId}</span>
                    {targetId && (
                        <button
                            type="button"
                            onClick={copyTargetIdToClipboard}
                            aria-label="Copiar Peer ID"
                            className="flex items-center gap-1 rounded bg-white/5 px-1.5 py-0.5 text-[9px] text-zinc-400 transition active:scale-95 hover:bg-white/10 hover:text-white"
                        >
                            {copied ? (
                                <>
                                    <CheckIcon />
                                    <span className="text-emerald-400 font-semibold">Copiado!</span>
                                </>
                            ) : (
                                <>
                                    <CopyIcon />
                                    <span>Copiar ID</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </main>
    );
}

/* ================================================= */
/* ICONS */
/* ================================================= */

function BackIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
            <path d="M15 18l-6-6 6-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CameraIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M4 7h3l1.5-2h3L13 7h3a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V9a2 2 0 012-2z" strokeLinecap="round" strokeLinejoin="round" />
            <circle cx="10" cy="13" r="3" />
        </svg>
    );
}

function TorchIcon({ isOn }: { isOn: boolean }) {
    return (
        <svg viewBox="0 0 24 24" fill={isOn ? "currentColor" : "none"} stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M18 6V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v2M6 6h12l-2 6v8a2 2 0 0 1-2 2h-4a2 2 0 0 1-2-2v-8L6 6z" strokeLinecap="round" strokeLinejoin="round" />
            {isOn && <line x1="12" y1="2" x2="12" y2="4" strokeLinecap="round" />}
        </svg>
    );
}

function PetCallIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M13.73 21a2 2 0 0 1-3.46 0" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function MaximizeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function MinimizeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function VolumeOnIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M15.54 8.46a5 5 0 0 1 0 7.07" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M19.07 4.93a10 10 0 0 1 0 14.14" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function VolumeMuteIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
            <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="23" y1="9" x2="17" y2="15" strokeLinecap="round" strokeLinejoin="round" />
            <line x1="17" y1="9" x2="23" y2="15" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function LandscapeIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <rect x="3" y="6" width="18" height="12" rx="2" />
            <path d="M8 15l2.5-3 2 2 1.5-2 2 3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function PortraitIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-6 w-6">
            <rect x="6" y="3" width="12" height="18" rx="2" />
            <path d="M9 17l2.5-3 2 2 1.5-2 1 1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function BatteryIcon({ level }: { level: number }) {
    const fillWidth = Math.max(0, Math.min(100, level));
    return (
        <svg viewBox="0 0 24 14" fill="none" className="h-4 w-5">
            <rect x="1" y="2" width="19" height="10" rx="2" stroke="currentColor" strokeWidth="1.5" />
            <path d="M22 5v4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <rect x="3" y="4" width="15" height="6" rx="1" fill="currentColor" style={{ clipPath: `inset(0 ${100 - fillWidth}% 0 0)` }} />
        </svg>
    );
}

function BatteryChargingIcon() {
    return (
        <svg viewBox="0 0 24 14" fill="none" stroke="currentColor" strokeWidth="1.5" className="h-4 w-5">
            <rect x="1" y="2" width="19" height="10" rx="2" />
            <path d="M22 5v4" strokeLinecap="round" />
            <path d="M11 3.5L8.5 8h3l-1 3 3.5-5h-3l1-2.5z" fill="currentColor" stroke="none" />
        </svg>
    );
}

function LiveIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 text-emerald-400">
            <circle cx="12" cy="12" r="8" />
            <circle cx="12" cy="12" r="3" fill="currentColor" stroke="none" />
        </svg>
    );
}

function LoadingIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5 animate-spin text-zinc-500">
            <path d="M12 3a9 9 0 109 9" strokeLinecap="round" />
        </svg>
    );
}

function CopyIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-3 w-3">
            <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
            <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}

function CheckIcon() {
    return (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="h-3 w-3 text-emerald-400">
            <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
    );
}