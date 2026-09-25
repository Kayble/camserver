"use client";

import { useEffect, useRef, useState } from "react";

export default function CameraPage() {
    const videoRef = useRef<HTMLVideoElement>(null);
    const isInitializing = useRef(false);

    const [peerId, setPeerId] =
        useState<string>("Conectando...");

    const [status, setStatus] =
        useState<string>("Iniciando...");

    const [errorMsg, setErrorMsg] =
        useState<string>("");

    const [batteryLevel, setBatteryLevel] =
        useState<number | null>(null);

    const [isCharging, setIsCharging] =
        useState(false);

    useEffect(() => {
        // Evita dupla inicialização no React Strict Mode
        if (isInitializing.current) return;

        isInitializing.current = true;

        let peer: any = null;
        let stream: MediaStream | null = null;

        const dataConnections = new Set<any>();

        async function getBatteryInfo() {
            try {
                if (!("getBattery" in navigator)) {
                    return null;
                }

                const battery = await (
                    navigator as any
                ).getBattery();

                return {
                    supported: true,
                    level: Math.round(
                        battery.level * 100
                    ),
                    charging: battery.charging,
                };
            } catch (error) {
                console.error(
                    "Erro ao obter bateria:",
                    error
                );

                return null;
            }
        }

        async function sendBatteryInfo(
            connection: any
        ) {
            try {
                const battery =
                    await getBatteryInfo();

                if (!battery) {
                    connection.send({
                        type: "battery",
                        supported: false,
                    });

                    return;
                }

                setBatteryLevel(battery.level);
                setIsCharging(battery.charging);

                connection.send({
                    type: "battery",
                    supported: true,
                    level: battery.level,
                    charging: battery.charging,
                    timestamp: Date.now(),
                });
            } catch (error) {
                console.error(
                    "Erro enviando bateria:",
                    error
                );
            }
        }

        async function startBatteryMonitoring() {
            try {
                if (!("getBattery" in navigator)) {
                    console.warn(
                        "Battery Status API não suportada."
                    );

                    return;
                }

                const battery = await (
                    navigator as any
                ).getBattery();

                const updateBatteryState = () => {
                    const level = Math.round(
                        battery.level * 100
                    );

                    setBatteryLevel(level);
                    setIsCharging(
                        battery.charging
                    );

                    // Atualiza todos os viewers conectados
                    dataConnections.forEach(
                        (connection) => {
                            if (
                                connection.open
                            ) {
                                connection.send({
                                    type: "battery",
                                    supported: true,
                                    level,
                                    charging:
                                        battery.charging,
                                    timestamp:
                                        Date.now(),
                                });
                            }
                        }
                    );
                };

                // Estado inicial
                updateBatteryState();

                // Quando o percentual mudar
                battery.addEventListener(
                    "levelchange",
                    updateBatteryState
                );

                // Quando começar/parar de carregar
                battery.addEventListener(
                    "chargingchange",
                    updateBatteryState
                );

                // Atualização periódica
                const interval =
                    window.setInterval(
                        updateBatteryState,
                        30000
                    );

                return () => {
                    clearInterval(interval);

                    battery.removeEventListener(
                        "levelchange",
                        updateBatteryState
                    );

                    battery.removeEventListener(
                        "chargingchange",
                        updateBatteryState
                    );
                };
            } catch (error) {
                console.error(
                    "Erro monitorando bateria:",
                    error
                );
            }
        }

        async function startCamera() {
            try {
                setStatus(
                    "Verificando suporte a HTTPS..."
                );

                if (
                    !navigator.mediaDevices ||
                    !window.isSecureContext
                ) {
                    throw new Error(
                        "A câmera exige um contexto seguro (HTTPS)."
                    );
                }

                setStatus(
                    "Solicitando permissão da câmera..."
                );

                stream =
                    await navigator.mediaDevices.getUserMedia(
                        {
                            video: {
                                facingMode: {
                                    ideal: "environment",
                                },
                            },
                            audio: false,
                        }
                    );

                if (videoRef.current) {
                    videoRef.current.srcObject =
                        stream;
                }

                setStatus(
                    "Conectando ao servidor PeerJS..."
                );

                const { Peer } =
                    await import("peerjs");

                const createPeerInstance = (
                    targetId: string
                ) => {
                    const newPeer =
                        new Peer(targetId);

                    newPeer.on(
                        "open",
                        (id: string) => {
                            setPeerId(id);

                            setStatus(
                                "Câmera pronta e transmitindo!"
                            );

                            setErrorMsg("");
                        }
                    );

                    // =========================
                    // CHAMADA DE VÍDEO
                    // =========================

                    newPeer.on(
                        "call",
                        (call: any) => {
                            call.answer(stream);

                            setStatus(
                                "Dispositivo conectado assistindo ao vivo!"
                            );
                        }
                    );

                    // =========================
                    // CANAL DE DADOS
                    // =========================

                    newPeer.on(
                        "connection",
                        (
                            connection: any
                        ) => {
                            console.log(
                                "Viewer conectado pelo canal de dados:",
                                connection.peer
                            );

                            dataConnections.add(
                                connection
                            );

                            connection.on(
                                "open",
                                async () => {
                                    console.log(
                                        "Canal de dados aberto:",
                                        connection.peer
                                    );

                                    // Envia bateria imediatamente
                                    await sendBatteryInfo(
                                        connection
                                    );
                                }
                            );

                            connection.on(
                                "close",
                                () => {
                                    console.log(
                                        "Viewer desconectado:",
                                        connection.peer
                                    );

                                    dataConnections.delete(
                                        connection
                                    );
                                }
                            );

                            connection.on(
                                "error",
                                (error: any) => {
                                    console.error(
                                        "Erro no canal de dados:",
                                        error
                                    );

                                    dataConnections.delete(
                                        connection
                                    );
                                }
                            );
                        }
                    );

                    // =========================
                    // ERROS PEERJS
                    // =========================

                    newPeer.on(
                        "error",
                        (err: any) => {
                            console.error(
                                "Erro PeerJS:",
                                err
                            );

                            if (
                                err.type ===
                                "unavailable-id"
                            ) {
                                const fallbackId = `minha-camera-a02s-${Math.floor(
                                    1000 +
                                    Math.random() *
                                    9000
                                )}`;

                                setErrorMsg(
                                    `O ID original estava preso. Tentando novo ID: ${fallbackId}`
                                );

                                newPeer.destroy();

                                peer =
                                    createPeerInstance(
                                        fallbackId
                                    );
                            } else {
                                setErrorMsg(
                                    `Erro PeerJS: ${err.type ||
                                    err.message
                                    }`
                                );

                                setStatus(
                                    "Erro de conexão"
                                );
                            }
                        }
                    );

                    return newPeer;
                };

                peer =
                    createPeerInstance(
                        "minha-camera-a02s"
                    );

                // Começa monitoramento da bateria
                startBatteryMonitoring();
            } catch (err: any) {
                console.error(
                    "ERRO:",
                    err
                );

                setStatus(
                    "Falha ao iniciar"
                );

                setErrorMsg(
                    `${err?.name || "Erro"
                    }: ${err?.message ||
                    "Erro desconhecido"
                    }`
                );
            }
        }

        startCamera();

        return () => {
            isInitializing.current = false;

            if (stream) {
                stream
                    .getTracks()
                    .forEach((track) =>
                        track.stop()
                    );
            }

            dataConnections.forEach(
                (connection) => {
                    try {
                        connection.close();
                    } catch { }
                }
            );

            dataConnections.clear();

            if (peer) {
                peer.destroy();
            }
        };
    }, []);

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-black p-4 text-white">
            <h1 className="mb-2 text-xl font-bold">
                Câmera de Transmissão
            </h1>

            <p className="mb-1 font-mono text-sm text-emerald-400">
                ID para conectar:{" "}
                <span className="rounded bg-zinc-800 px-2 py-1 font-bold text-white">
                    {peerId}
                </span>
            </p>

            <p className="mb-4 text-xs text-yellow-400">
                {status}
            </p>

            {errorMsg && (
                <div className="mb-4 max-w-md rounded-xl border border-red-500 bg-red-500/20 p-3 text-center text-xs text-red-300">
                    {errorMsg}
                </div>
            )}

            <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900"
            />

            {/* Status da bateria */}
            <div className="mt-4 flex items-center gap-3 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3">
                <span className="text-xl">
                    {isCharging
                        ? "⚡"
                        : "🔋"}
                </span>

                <div>
                    <p className="text-xs text-zinc-500">
                        Bateria
                    </p>

                    <p className="text-sm font-semibold">
                        {batteryLevel !== null
                            ? `${batteryLevel}%`
                            : "Indisponível"}
                    </p>
                </div>

                {isCharging && (
                    <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-[10px] font-medium text-emerald-400">
                        Carregando
                    </span>
                )}
            </div>
        </main>
    );
}
