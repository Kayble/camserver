"use client";

import { useEffect, useMemo, useState } from "react";

type Camera = {
    id: string;
    name: string;
    location: string;
    peerId: string;
    status: "online" | "offline";
    createdAt: string;
};

const STORAGE_KEY = "camserver:cameras";

export default function AdminPage() {
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [cameraStatuses, setCameraStatuses] = useState<Record<string, "online" | "offline">>({});
    const [showModal, setShowModal] = useState(false);

    const [name, setName] = useState("");
    const [location, setLocation] = useState("");
    const [peerId, setPeerId] = useState("");

    useEffect(() => {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                setCameras(JSON.parse(saved));
            }
        } catch (error) {
            console.error("Erro ao carregar câmeras:", error);
        }
    }, []);

    useEffect(() => {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(cameras));
    }, [cameras]);

    const handleStatusChange = (id: string, status: "online" | "offline") => {
        setCameraStatuses((prev) => {
            if (prev[id] === status) return prev;
            return { ...prev, [id]: status };
        });
    };

    const onlineCount = useMemo(
        () => cameras.filter((camera) => cameraStatuses[camera.id] === "online").length,
        [cameras, cameraStatuses]
    );

    const offlineCount = useMemo(
        () => cameras.length - onlineCount,
        [cameras, onlineCount]
    );

    function resetForm() {
        setName("");
        setLocation("");
        setPeerId("");
    }

    function openModal() {
        resetForm();
        setShowModal(true);
    }

    function closeModal() {
        setShowModal(false);
        resetForm();
    }

    function addCamera(event: React.FormEvent) {
        event.preventDefault();

        if (!name.trim() || !peerId.trim()) {
            return;
        }

        const camera: Camera = {
            id: crypto.randomUUID(),
            name: name.trim(),
            location: location.trim() || "Local não informado",
            peerId: peerId.trim(),
            status: "offline",
            createdAt: new Date().toISOString(),
        };

        setCameras((current) => [camera, ...current]);
        closeModal();
    }

    function removeCamera(id: string) {
        const camera = cameras.find((item) => item.id === id);
        if (!camera) return;

        const confirmed = window.confirm(`Remover a câmera "${camera.name}"?`);
        if (!confirmed) return;

        setCameras((current) => current.filter((item) => item.id !== id));
        setCameraStatuses((prev) => {
            const updated = { ...prev };
            delete updated[id];
            return updated;
        });
    }

    function openCamera(camera: Camera) {
        const params = new URLSearchParams({
            peer: camera.peerId,
            name: camera.name,
        });

        window.location.href = `/viewer?${params.toString()}`;
    }

    return (
        <main className="min-h-screen bg-zinc-950 text-white">
            {/* Header */}
            <header className="sticky top-0 z-30 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
                    <div>
                        <p className="text-xs font-medium uppercase tracking-widest text-emerald-400">
                            CamServer
                        </p>
                        <h1 className="mt-1 text-xl font-bold sm:text-2xl">
                            Dashboard
                        </h1>
                    </div>

                    <div className="flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" />
                        <span className="text-xs text-zinc-300">
                            Sistema ativo
                        </span>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-7xl px-4 py-5 pb-28 sm:px-6 sm:py-8 lg:px-8">
                {/* Welcome */}
                <section className="mb-6">
                    <h2 className="text-2xl font-bold tracking-tight">
                        Olá, administrador
                    </h2>
                    <p className="mt-1 text-sm text-zinc-400">
                        Gerencie suas câmeras e acompanhe o status das transmissões em tempo real.
                    </p>
                </section>

                {/* Statistics */}
                <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <StatCard
                        title="Câmeras"
                        value={cameras.length}
                        icon={
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
                        }
                    />

                    <StatCard
                        title="Online"
                        value={onlineCount}
                        icon={
                            <span className="h-3 w-3 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" />
                        }
                        valueClass="text-emerald-400"
                    />

                    <StatCard
                        title="Offline"
                        value={offlineCount}
                        icon={
                            <span className="h-3 w-3 rounded-full bg-zinc-600" />
                        }
                        valueClass="text-zinc-400"
                    />
                </section>

                {/* Cameras */}
                <section className="mt-8">
                    <div className="mb-4 flex items-center justify-between">
                        <div>
                            <h2 className="text-lg font-bold">
                                Minhas câmeras
                            </h2>
                            <p className="text-sm text-zinc-500">
                                {cameras.length === 0
                                    ? "Nenhuma câmera cadastrada"
                                    : `${cameras.length} câmera${cameras.length === 1 ? "" : "s"} cadastrada${cameras.length === 1 ? "" : "s"}`}
                            </p>
                        </div>

                        <button
                            onClick={openModal}
                            className="hidden rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-semibold text-black transition hover:bg-emerald-400 active:scale-95 sm:block"
                        >
                            + Adicionar câmera
                        </button>
                    </div>

                    {cameras.length === 0 ? (
                        <EmptyState onAdd={openModal} />
                    ) : (
                        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                            {cameras.map((camera) => (
                                <CameraCard
                                    key={camera.id}
                                    camera={camera}
                                    onOpen={() => openCamera(camera)}
                                    onRemove={() => removeCamera(camera.id)}
                                    onStatusChange={(status) => handleStatusChange(camera.id, status)}
                                />
                            ))}
                        </div>
                    )}
                </section>
            </div>

            {/* Mobile floating action button */}
            <button
                onClick={openModal}
                aria-label="Adicionar câmera"
                className="fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500 text-2xl font-light text-black shadow-xl shadow-emerald-950/50 transition hover:bg-emerald-400 active:scale-90 sm:hidden"
            >
                +
            </button>

            {/* Add camera modal */}
            {showModal && (
                <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4">
                    <div
                        className="w-full rounded-t-3xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl sm:max-w-md sm:rounded-3xl"
                        role="dialog"
                        aria-modal="true"
                    >
                        <div className="mb-6 flex items-center justify-between">
                            <div>
                                <h2 className="text-xl font-bold">
                                    Adicionar câmera
                                </h2>
                                <p className="mt-1 text-sm text-zinc-500">
                                    Cadastre uma nova câmera no sistema.
                                </p>
                            </div>

                            <button
                                onClick={closeModal}
                                className="flex h-9 w-9 items-center justify-center rounded-full bg-zinc-900 text-zinc-400 transition hover:bg-zinc-800 hover:text-white"
                            >
                                ×
                            </button>
                        </div>

                        <form onSubmit={addCamera} className="space-y-4">
                            <Input
                                label="Nome da câmera"
                                placeholder="Ex.: Câmera da sala"
                                value={name}
                                onChange={setName}
                                required
                            />

                            <Input
                                label="Local"
                                placeholder="Ex.: Sala de estar"
                                value={location}
                                onChange={setLocation}
                            />

                            <Input
                                label="Peer ID"
                                placeholder="Ex.: minha-camera-a02s"
                                value={peerId}
                                onChange={setPeerId}
                                required
                            />

                            <div className="rounded-2xl border border-blue-500/20 bg-blue-500/10 p-3">
                                <p className="text-xs leading-relaxed text-blue-300">
                                    O Peer ID precisa ser o mesmo utilizado pelo dispositivo que transmite a câmera.
                                </p>
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={closeModal}
                                    className="flex-1 rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800"
                                >
                                    Cancelar
                                </button>

                                <button
                                    type="submit"
                                    className="flex-1 rounded-xl bg-emerald-500 px-4 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 active:scale-[0.98]"
                                >
                                    Adicionar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </main>
    );
}

function StatCard({
    title,
    value,
    icon,
    valueClass = "text-white",
}: {
    title: string;
    value: number;
    icon: React.ReactNode;
    valueClass?: string;
}) {
    return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="mb-3 flex h-6 items-center text-zinc-400">
                {icon}
            </div>
            <p className="text-xs text-zinc-500">{title}</p>
            <p className={`mt-1 text-2xl font-bold ${valueClass}`}>
                {value}
            </p>
        </div>
    );
}

function CameraCard({
    camera,
    onOpen,
    onRemove,
    onStatusChange,
}: {
    camera: Camera;
    onOpen: () => void;
    onRemove: () => void;
    onStatusChange: (status: "online" | "offline") => void;
}) {
    const [snapshot, setSnapshot] = useState<string | null>(null);
    const [isOnline, setIsOnline] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        let peer: any = null;
        let call: any = null;
        let isMounted = true;

        async function captureSnapshot() {
            try {
                const { Peer } = await import("peerjs");
                peer = new Peer();

                peer.on("open", () => {
                    if (!isMounted) return;

                    // Stream fictício para solicitar o feed WebRTC
                    const canvas = document.createElement("canvas");
                    canvas.width = canvas.height = 1;
                    const dummyStream = canvas.captureStream();

                    call = peer.call(camera.peerId, dummyStream);

                    if (!call) {
                        if (isMounted) {
                            setIsOnline(false);
                            setIsLoading(false);
                            onStatusChange("offline");
                        }
                        return;
                    }

                    call.on("stream", (remoteStream: MediaStream) => {
                        if (!isMounted) return;

                        // Cria um elemento de vídeo temporário para renderizar o frame
                        const tempVideo = document.createElement("video");
                        tempVideo.muted = true;
                        tempVideo.playsInline = true;
                        tempVideo.srcObject = remoteStream;

                        tempVideo.onloadedmetadata = async () => {
                            try {
                                await tempVideo.play();

                                // Aguarda 300ms para garantir que o frame esteja pronto
                                setTimeout(() => {
                                    if (!isMounted) return;

                                    const snapCanvas = document.createElement("canvas");
                                    snapCanvas.width = tempVideo.videoWidth || 640;
                                    snapCanvas.height = tempVideo.videoHeight || 360;

                                    const ctx = snapCanvas.getContext("2d");
                                    if (ctx) {
                                        ctx.drawImage(tempVideo, 0, 0, snapCanvas.width, snapCanvas.height);
                                        const dataUrl = snapCanvas.toDataURL("image/jpeg", 0.7);
                                        setSnapshot(dataUrl);
                                    }

                                    setIsOnline(true);
                                    setIsLoading(false);
                                    onStatusChange("online");

                                    // Desconecta imediatamente após tirar a foto
                                    remoteStream.getTracks().forEach((track) => track.stop());
                                    if (call) call.close();
                                    if (peer) peer.destroy();
                                }, 300);
                            } catch {
                                if (isMounted) {
                                    setIsOnline(false);
                                    setIsLoading(false);
                                    onStatusChange("offline");
                                }
                            }
                        };
                    });

                    call.on("error", () => {
                        if (!isMounted) return;
                        setIsOnline(false);
                        setIsLoading(false);
                        onStatusChange("offline");
                    });
                });

                peer.on("error", () => {
                    if (!isMounted) return;
                    setIsOnline(false);
                    setIsLoading(false);
                    onStatusChange("offline");
                });

            } catch {
                if (isMounted) {
                    setIsOnline(false);
                    setIsLoading(false);
                    onStatusChange("offline");
                }
            }
        }

        captureSnapshot();

        return () => {
            isMounted = false;
            if (call) call.close();
            if (peer) peer.destroy();
        };
    }, [camera.peerId]);

    return (
        <article className="overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900/70 transition hover:border-zinc-700">
            {/* Camera preview */}
            <div className="group relative aspect-video w-full overflow-hidden bg-zinc-950">
                {snapshot && isOnline ? (
                    <img
                        src={snapshot}
                        alt={`Preview ${camera.name}`}
                        className="h-full w-full object-cover"
                    />
                ) : (
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                        {isLoading ? (
                            <div className="flex flex-col items-center">
                                <div className="h-6 w-6 animate-spin rounded-full border-2 border-zinc-700 border-t-emerald-400" />
                                <span className="mt-2 text-[11px] text-zinc-500">Conectando e capturando...</span>
                            </div>
                        ) : (
                            <>
                                <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-full bg-zinc-900 text-zinc-600 ring-1 ring-zinc-800">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m16 13 5 3V8l-5 3" /><rect width="14" height="12" x="2" y="6" rx="2" /><path d="M2 2l20 20" /></svg>
                                </div>
                                <span className="text-xs text-zinc-500">Câmera Offline</span>
                            </>
                        )}
                    </div>
                )}

                {/* Overlay hover para expandir */}
                <button
                    onClick={onOpen}
                    className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 opacity-0 transition-opacity group-hover:opacity-100"
                >
                    <span className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-black shadow-lg">
                        Abrir Transmissão
                    </span>
                </button>

                {/* Badge de Status */}
                <div className="pointer-events-none absolute left-3 top-3 z-20 flex items-center gap-2 rounded-full border border-zinc-800 bg-black/70 px-2.5 py-1.5 backdrop-blur">
                    <span
                        className={`h-2 w-2 rounded-full ${isOnline
                                ? "bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]"
                                : "bg-zinc-600"
                            }`}
                    />
                    <span className="text-[11px] font-medium">
                        {isOnline ? "Online" : "Offline"}
                    </span>
                </div>
            </div>

            {/* Info */}
            <div className="p-4">
                <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                        <h3 className="truncate font-semibold text-zinc-100">
                            {camera.name}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                            📍 {camera.location}
                        </p>
                    </div>

                    <button
                        onClick={onRemove}
                        aria-label={`Remover ${camera.name}`}
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" /><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" /></svg>
                    </button>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-zinc-800/80 pt-3">
                    <span className="max-w-[65%] truncate font-mono text-[10px] text-zinc-500">
                        {camera.peerId}
                    </span>

                    <button
                        onClick={onOpen}
                        className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-semibold text-zinc-200 transition hover:bg-zinc-700"
                    >
                        Abrir
                    </button>
                </div>
            </div>
        </article>
    );
}

function EmptyState({ onAdd }: { onAdd: () => void }) {
    return (
        <div className="rounded-3xl border border-dashed border-zinc-800 bg-zinc-900/30 px-5 py-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-500">
                <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
            </div>

            <h3 className="mt-5 text-base font-semibold">
                Nenhuma câmera cadastrada
            </h3>

            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-zinc-500">
                Adicione sua primeira câmera informando o nome, local e Peer ID do dispositivo.
            </p>

            <button
                onClick={onAdd}
                className="mt-6 rounded-xl bg-emerald-500 px-5 py-3 text-sm font-semibold text-black transition hover:bg-emerald-400 active:scale-95"
            >
                + Adicionar primeira câmera
            </button>
        </div>
    );
}

function Input({
    label,
    placeholder,
    value,
    onChange,
    required = false,
}: {
    label: string;
    placeholder: string;
    value: string;
    onChange: (value: string) => void;
    required?: boolean;
}) {
    return (
        <label className="block">
            <span className="mb-2 block text-sm font-medium text-zinc-300">
                {label}
                {required && <span className="ml-1 text-emerald-400">*</span>}
            </span>

            <input
                type="text"
                value={value}
                required={required}
                placeholder={placeholder}
                onChange={(event) => onChange(event.target.value)}
                className="w-full rounded-xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm text-white outline-none placeholder:text-zinc-600 transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/10"
            />
        </label>
    );
}