"use client";

import { useState, useMemo } from "react";
import { BookOpenIcon, CheckSquareIcon, FileTextIcon, FolderIcon, GraduationCapIcon, Loader2Icon, SparklesIcon, SquareIcon, XIcon } from "lucide-react";
import { HostDialog } from "@/components/host-dialog";
import { useBabelCatalog } from "./use-babel-catalog";
import type { BabelChapter, BabelResource, BabelSubject } from "./types";

export interface BabelSelectModalProps {
	open: boolean;
	onClose: () => void;
	onSelectPaths: (paths: string[]) => void;
}

export function BabelSelectModal({ open, onClose, onSelectPaths }: BabelSelectModalProps) {
	const { catalog, loading, error, refetch } = useBabelCatalog(open);
	const [selectedSubjectId, setSelectedSubjectId] = useState<number | null>(null);
	const [selectedChapterId, setSelectedChapterId] = useState<number | null>(null);

	// Map of checked absolute paths
	const [checkedPaths, setCheckedPaths] = useState<Set<string>>(new Set());

	// Active subject
	const activeSubject = useMemo<BabelSubject | null>(() => {
		if (!catalog || catalog.length === 0) return null;
		if (selectedSubjectId !== null) {
			const found = catalog.find((s) => s.id === selectedSubjectId);
			if (found) return found;
		}
		return catalog[0] ?? null;
	}, [catalog, selectedSubjectId]);

	// Active chapter
	const activeChapter = useMemo<BabelChapter | null>(() => {
		if (!activeSubject || !activeSubject.chapters || activeSubject.chapters.length === 0) return null;
		if (selectedChapterId !== null) {
			const found = activeSubject.chapters.find((c) => c.id === selectedChapterId);
			if (found) return found;
		}
		return activeSubject.chapters[0] ?? null;
	}, [activeSubject, selectedChapterId]);

	// Toggle individual path
	const togglePath = (path: string) => {
		setCheckedPaths((prev) => {
			const next = new Set(prev);
			if (next.has(path)) {
				next.delete(path);
			} else {
				next.add(path);
			}
			return next;
		});
	};

	// Get all available paths for the active chapter
	const activeChapterPaths = useMemo<string[]>(() => {
		if (!activeChapter) return [];
		const paths: string[] = [];
		if (activeChapter.guide?.available && activeChapter.guide.absolutePath) {
			paths.push(activeChapter.guide.absolutePath);
		}
		for (const res of activeChapter.resources) {
			if (res.absolutePath) {
				paths.push(res.absolutePath);
			}
		}
		return paths;
	}, [activeChapter]);

	// Are all resources of the active chapter checked?
	const allActiveChecked = useMemo(() => {
		if (activeChapterPaths.length === 0) return false;
		return activeChapterPaths.every((p) => checkedPaths.has(p));
	}, [activeChapterPaths, checkedPaths]);

	// Toggle all resources for active chapter
	const toggleAllActiveChapter = () => {
		setCheckedPaths((prev) => {
			const next = new Set(prev);
			if (allActiveChecked) {
				for (const p of activeChapterPaths) next.delete(p);
			} else {
				for (const p of activeChapterPaths) next.add(p);
			}
			return next;
		});
	};

	// Confirm and inject
	const handleConfirm = () => {
		const paths = Array.from(checkedPaths);
		if (paths.length > 0) {
			onSelectPaths(paths);
		}
		onClose();
	};

	if (!open) return null;

	const frame = (
		<div
			role="dialog"
			aria-modal="true"
			aria-label="Sélectionner des cours Babel ICS"
			className="relative flex h-[85vh] max-h-[750px] w-[95vw] max-w-[1050px] flex-col rounded-xl border border-border bg-card shadow-2xl text-foreground overflow-hidden"
		>
			{/* Top Bar Header */}
			<div className="flex shrink-0 items-center justify-between border-b border-border px-5 py-3.5 bg-muted/30">
				<div className="flex items-center gap-2.5">
					<div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/10 text-sky-400 border border-sky-500/20">
						<GraduationCapIcon className="size-5" />
					</div>
					<div>
						<h2 className="text-sm font-semibold tracking-wide flex items-center gap-2">
							Cours & Ressources Babel ICS
							<span className="rounded-full bg-sky-500/15 px-2 py-0.5 text-[10px] font-medium text-sky-400 border border-sky-500/30">
								Dynamique
							</span>
						</h2>
						<p className="text-xs text-muted-foreground">
							Cochez les supports, fiches ou modes d'emploi à injecter dans la session du tuteur IA.
						</p>
					</div>
				</div>
				<button
					type="button"
					onClick={onClose}
					className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground cursor-pointer"
					title="Fermer"
				>
					<XIcon className="size-4" />
				</button>
			</div>

			{/* Main Content Area: 3 Columns */}
			<div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-border">
				{/* Loading State */}
				{loading && catalog.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-muted-foreground">
						<Loader2Icon className="size-7 animate-spin text-sky-400" />
						<p className="text-xs">Chargement du catalogue Babel ICS en cours...</p>
					</div>
				)}

				{/* Error State */}
				{error && !loading && catalog.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
						<div className="rounded-full bg-destructive/10 p-3 text-destructive">
							<XIcon className="size-6" />
						</div>
						<p className="text-sm font-medium text-foreground">Connexion à Babel ICS impossible</p>
						<p className="max-w-md text-xs text-muted-foreground">{error}</p>
						<button
							type="button"
							onClick={() => void refetch()}
							className="mt-2 rounded-md bg-secondary px-3 py-1.5 text-xs text-secondary-foreground hover:bg-secondary/80 cursor-pointer"
						>
							Réessayer
						</button>
					</div>
				)}

				{/* 3 Columns Display */}
				{!loading && catalog.length > 0 && (
					<>
						{/* Colonne 1 : Matières (Subjects) */}
						<div className="w-56 shrink-0 flex flex-col bg-muted/10 overflow-y-auto p-2 gap-1">
							<div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
								Matières ({catalog.length})
							</div>
							{catalog.map((subj) => {
								const active = activeSubject?.id === subj.id;
								return (
									<button
										key={subj.id}
										type="button"
										onClick={() => {
											setSelectedSubjectId(subj.id);
											if (subj.chapters && subj.chapters.length > 0 && subj.chapters[0]) {
												setSelectedChapterId(subj.chapters[0].id);
											}
										}}
										className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-xs transition-all cursor-pointer ${
											active
												? "bg-accent text-accent-foreground font-medium shadow-xs"
												: "text-muted-foreground hover:bg-muted hover:text-foreground"
										}`}
									>
										<span className="text-base shrink-0">{subj.icon || "📚"}</span>
										<div className="truncate flex-1">
											<div className="truncate font-medium">{subj.title}</div>
											<div className="text-[10px] text-muted-foreground">
												{subj.chapters.length} module(s)
											</div>
										</div>
									</button>
								);
							})}
						</div>

						{/* Colonne 2 : Modules (Chapters) */}
						<div className="w-64 shrink-0 flex flex-col bg-muted/5 overflow-y-auto p-2 gap-1">
							<div className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
								Modules du cours
							</div>
							{activeSubject?.chapters && activeSubject.chapters.length > 0 ? (
								activeSubject.chapters.map((chap) => {
									const active = activeChapter?.id === chap.id;
									return (
										<button
											key={chap.id}
											type="button"
											onClick={() => setSelectedChapterId(chap.id)}
											className={`flex flex-col gap-1 rounded-lg px-2.5 py-2 text-left text-xs transition-all cursor-pointer ${
												active
													? "bg-accent text-accent-foreground font-medium border border-border"
													: "text-muted-foreground hover:bg-muted hover:text-foreground"
											}`}
										>
											<div className="truncate font-medium text-foreground">
												M{chap.moduleNumber} : {chap.title}
											</div>
											<div className="flex items-center gap-1.5 flex-wrap">
												{chap.resources.filter((r) => r.isPdf).length > 0 && (
													<span className="rounded bg-rose-500/10 px-1.5 py-0.2 text-[9px] font-medium text-rose-400">
														{chap.resources.filter((r) => r.isPdf).length} PDF
													</span>
												)}
												{chap.resources.filter((r) => r.isMarkdown).length > 0 && (
													<span className="rounded bg-emerald-500/10 px-1.5 py-0.2 text-[9px] font-medium text-emerald-400">
														{chap.resources.filter((r) => r.isMarkdown).length} MD
													</span>
												)}
												{chap.hasGuide && (
													<span className="rounded bg-sky-500/10 px-1.5 py-0.2 text-[9px] font-medium text-sky-400">
														🐧 Guide
													</span>
												)}
											</div>
										</button>
									);
								})
							) : (
								<div className="p-4 text-center text-xs text-muted-foreground">
									Aucun module dans cette matière.
								</div>
							)}
						</div>

						{/* Colonne 3 : Ressources détaillées du module sélectionné */}
						<div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 gap-4">
							{activeChapter ? (
								<>
									<div className="flex items-center justify-between border-b border-border pb-2.5">
										<div>
											<h3 className="text-xs font-semibold text-foreground uppercase tracking-wide">
												Module {activeChapter.moduleNumber} : {activeChapter.title}
											</h3>
											<p className="text-[11px] text-muted-foreground">
												Sélectionnez les contenus à joindre parmi les supports et fiches générées.
											</p>
										</div>
										{activeChapterPaths.length > 0 && (
											<button
												type="button"
												onClick={toggleAllActiveChapter}
												className="flex items-center gap-1.5 text-xs text-sky-400 hover:text-sky-300 font-medium cursor-pointer"
											>
												{allActiveChecked ? (
													<>
														<CheckSquareIcon className="size-3.5" />
														<span>Tout désélectionner</span>
													</>
												) : (
													<>
														<SquareIcon className="size-3.5" />
														<span>Tout sélectionner</span>
													</>
												)}
											</button>
										)}
									</div>

									{/* 1. Mode d'emploi IA (Guide) */}
									{activeChapter.guide?.available && activeChapter.guide.absolutePath && (
										<div className="flex flex-col gap-1.5">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-sky-400 flex items-center gap-1.5">
												<SparklesIcon className="size-3 text-sky-400" />
												<span>Mode d'emploi & Synthèse IA du Module</span>
											</div>
											<label
												className={`flex items-start gap-3 rounded-lg border p-3 transition-all cursor-pointer ${
													checkedPaths.has(activeChapter.guide.absolutePath)
														? "border-sky-500/40 bg-sky-500/5 shadow-xs"
														: "border-border bg-card/60 hover:bg-muted/30"
												}`}
											>
												<input
													type="checkbox"
													checked={checkedPaths.has(activeChapter.guide.absolutePath)}
													onChange={() => togglePath(activeChapter.guide!.absolutePath)}
													className="mt-0.5 rounded border-border text-sky-500 focus:ring-sky-500 size-4 cursor-pointer"
												/>
												<div className="flex-1 text-xs">
													<div className="font-semibold text-foreground flex items-center gap-2">
														<span>🐧 {activeChapter.guide.title}</span>
														<span className="rounded bg-sky-500/15 px-1.5 py-0.5 text-[9px] font-semibold text-sky-400">
															{activeChapter.guide.actionsCount} concepts & commandes
														</span>
													</div>
													<p className="mt-0.5 text-[11px] text-muted-foreground">
														Fiche Markdown autonome générée contenant l'intégralité des commandes de terminal, règles de conception, exemples et astuces d'examen.
													</p>
												</div>
											</label>
										</div>
									)}

									{/* 2. Supports de Cours & TPs PDF */}
									{activeChapter.resources.filter((r) => r.isPdf).length > 0 && (
										<div className="flex flex-col gap-1.5">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
												<FileTextIcon className="size-3 text-rose-400" />
												<span>Supports de cours & TPs (PDF)</span>
											</div>
											<div className="flex flex-col gap-1.5">
												{activeChapter.resources
													.filter((r) => r.isPdf)
													.map((res) => {
														const path = res.absolutePath;
														if (!path) return null;
														const checked = checkedPaths.has(path);
														const sizeMo = res.sizeBytes
															? (res.sizeBytes / (1024 * 1024)).toFixed(1) + " Mo"
															: "";
														return (
															<label
																key={res.id}
																className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-all cursor-pointer ${
																	checked
																		? "border-rose-500/40 bg-rose-500/5"
																		: "border-border bg-card/40 hover:bg-muted/30"
																}`}
															>
																<input
																	type="checkbox"
																	checked={checked}
																	onChange={() => togglePath(path)}
																	className="rounded border-border text-rose-500 focus:ring-rose-500 size-4 cursor-pointer"
																/>
																<span className="text-rose-400 font-mono text-[11px] shrink-0">📄</span>
																<span className="truncate flex-1 font-medium text-foreground">
																	{res.title}
																</span>
																{sizeMo && (
																	<span className="text-[10px] text-muted-foreground font-mono shrink-0">
																		{sizeMo}
																	</span>
																)}
															</label>
														);
													})}
											</div>
										</div>
									)}

									{/* 3. Résumés Markdown */}
									{activeChapter.resources.filter((r) => r.isMarkdown).length > 0 && (
										<div className="flex flex-col gap-1.5">
											<div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
												<BookOpenIcon className="size-3 text-emerald-400" />
												<span>Fiches de cours récapitulatives (Markdown)</span>
											</div>
											<div className="flex flex-col gap-1.5">
												{activeChapter.resources
													.filter((r) => r.isMarkdown)
													.map((res) => {
														const path = res.absolutePath;
														if (!path) return null;
														const checked = checkedPaths.has(path);
														return (
															<label
																key={res.id}
																className={`flex items-center gap-3 rounded-lg border px-3 py-2 text-xs transition-all cursor-pointer ${
																	checked
																		? "border-emerald-500/40 bg-emerald-500/5"
																		: "border-border bg-card/40 hover:bg-muted/30"
																}`}
															>
																<input
																	type="checkbox"
																	checked={checked}
																	onChange={() => togglePath(path)}
																	className="rounded border-border text-emerald-500 focus:ring-emerald-500 size-4 cursor-pointer"
																/>
																<span className="text-emerald-400 font-mono text-[11px] shrink-0">📖</span>
																<span className="truncate flex-1 font-medium text-foreground">
																	{res.title}
																</span>
															</label>
														);
													})}
											</div>
										</div>
									)}

									{/* Si aucun contenu dans le module */}
									{!activeChapter.guide?.available &&
										activeChapter.resources.length === 0 && (
											<div className="py-12 text-center text-xs text-muted-foreground">
												Ce module ne contient encore aucun fichier dans Babel ICS.
											</div>
										)}
								</>
							) : (
								<div className="flex flex-1 items-center justify-center text-xs text-muted-foreground">
									Sélectionnez un module pour afficher ses fichiers.
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{/* Bottom Action Footer */}
			<div className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3 bg-muted/20">
				<div className="text-xs text-muted-foreground">
					{checkedPaths.size > 0 ? (
						<span>
							<strong className="text-foreground">{checkedPaths.size}</strong> ressource(s) sélectionnée(s)
						</span>
					) : (
						<span>Aucun fichier sélectionné</span>
					)}
				</div>
				<div className="flex items-center gap-2.5">
					<button
						type="button"
						onClick={onClose}
						className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer"
					>
						Annuler
					</button>
					<button
						type="button"
						disabled={checkedPaths.size === 0}
						onClick={handleConfirm}
						className="rounded-md bg-sky-500 px-4 py-1.5 text-xs font-medium text-slate-950 transition-colors hover:bg-sky-400 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-xs"
					>
						{checkedPaths.size > 0
							? `✓ Joindre à la session (${checkedPaths.size})`
							: "Joindre à la session"}
					</button>
				</div>
			</div>
		</div>
	);

	return (
		<HostDialog
			open={open}
			onClose={onClose}
			frame={frame}
			backdropProps={{
				className: "fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-xs p-4",
			}}
		>
			{frame.props.children}
		</HostDialog>
	);
}
