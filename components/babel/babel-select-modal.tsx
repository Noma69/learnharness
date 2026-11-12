"use client";

import { useState, useMemo } from "react";
import { BookOpenIcon, CheckSquareIcon, FileTextIcon, GraduationCapIcon, Loader2Icon, SparklesIcon, SquareIcon, XIcon } from "lucide-react";
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
			tabIndex={-1}
			className="relative flex h-[640px] max-h-[85vh] w-[980px] max-w-[92vw] flex-col overflow-hidden rounded-md border border-border bg-card shadow-xl text-foreground"
			onClick={(e) => e.stopPropagation()}
		>
			{/* Top Bar Header — LearnHarness style: CMU serif title & minimal tags */}
			<header className="flex h-15 shrink-0 items-center justify-between border-b border-border px-5">
				<div className="flex items-center gap-3">
					<div className="flex size-7 items-center justify-center rounded-sm border border-border bg-background text-muted-foreground">
						<GraduationCapIcon className="size-4" />
					</div>
					<div>
						<h2 className="font-title text-xl tracking-tight flex items-center gap-2">
							Babel ICS
							<span className="rounded-xs border border-border bg-background px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
								Catalogue
							</span>
						</h2>
					</div>
				</div>
				<button
					type="button"
					aria-label="Fermer"
					onClick={onClose}
					className="size-7 rounded-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground flex items-center justify-center cursor-pointer"
					title="Fermer"
				>
					<XIcon className="size-3.5" />
				</button>
			</header>

			{/* Main Content Area: 3 Columns */}
			<div className="flex flex-1 min-h-0 overflow-hidden divide-x divide-border">
				{/* Loading State */}
				{loading && catalog.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-muted-foreground">
						<Loader2Icon className="size-6 animate-spin text-muted-foreground" />
						<p className="font-mono text-xs">Chargement du catalogue Babel ICS…</p>
					</div>
				)}

				{/* Error State */}
				{error && !loading && catalog.length === 0 && (
					<div className="flex flex-1 flex-col items-center justify-center gap-3 p-10 text-center">
						<div className="rounded-md border border-destructive/30 bg-destructive/10 p-2.5 text-destructive">
							<XIcon className="size-5" />
						</div>
						<p className="font-title text-base text-foreground">Connexion à Babel ICS impossible</p>
						<p className="max-w-md font-mono text-xs text-muted-foreground">{error}</p>
						<button
							type="button"
							onClick={() => void refetch()}
							className="mt-2 rounded-md border border-border px-3 py-1.5 font-mono text-xs text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
						>
							Réessayer
						</button>
					</div>
				)}

				{/* 3 Columns Display */}
				{!loading && catalog.length > 0 && (
					<>
						{/* Colonne 1 : Matières (Subjects) */}
						<nav
							aria-label="Matières Babel"
							className="w-52 shrink-0 flex flex-col overflow-y-auto p-2 gap-1 bg-card"
						>
							<div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
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
										className={`flex items-center gap-2.5 rounded-sm px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
											active
												? "bg-accent text-foreground font-medium"
												: "text-muted-foreground hover:bg-accent hover:text-foreground"
										}`}
									>
										<span className="text-sm shrink-0">{subj.icon || "📚"}</span>
										<div className="truncate flex-1 min-w-0">
											<div className="truncate font-medium">{subj.title}</div>
											<div className="font-mono text-[10px] text-muted-foreground">
												{subj.chapters.length} {subj.chapters.length > 1 ? "modules" : "module"}
											</div>
										</div>
									</button>
								);
							})}
						</nav>

						{/* Colonne 2 : Modules (Chapters) */}
						<nav
							aria-label="Modules du cours"
							className="w-60 shrink-0 flex flex-col overflow-y-auto p-2 gap-1 bg-card"
						>
							<div className="px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
								Modules du cours
							</div>
							{activeSubject?.chapters && activeSubject.chapters.length > 0 ? (
								activeSubject.chapters.map((chap) => {
									const active = activeChapter?.id === chap.id;
									const pdfCount = chap.resources.filter((r) => r.isPdf).length;
									const mdCount = chap.resources.filter((r) => r.isMarkdown).length;
									return (
										<button
											key={chap.id}
											type="button"
											onClick={() => setSelectedChapterId(chap.id)}
											className={`flex flex-col gap-1 rounded-sm px-2.5 py-2 text-left text-xs transition-colors cursor-pointer ${
												active
													? "bg-accent text-foreground font-medium"
													: "text-muted-foreground hover:bg-accent hover:text-foreground"
											}`}
										>
											<div className="truncate font-medium">
												M{chap.moduleNumber} : {chap.title}
											</div>
											<div className="flex items-center gap-1.5 flex-wrap">
												{chap.hasGuide && (
													<span className="rounded-xs border border-border bg-background px-1.5 py-0.2 font-mono text-[9px] text-muted-foreground">
														Guide IA
													</span>
												)}
												{pdfCount > 0 && (
													<span className="rounded-xs border border-border bg-background px-1.5 py-0.2 font-mono text-[9px] text-muted-foreground">
														{pdfCount} PDF
													</span>
												)}
												{mdCount > 0 && (
													<span className="rounded-xs border border-border bg-background px-1.5 py-0.2 font-mono text-[9px] text-muted-foreground">
														{mdCount} MD
													</span>
												)}
											</div>
										</button>
									);
								})
							) : (
								<div className="p-4 text-center font-mono text-xs text-muted-foreground">
									Aucun module dans cette matière.
								</div>
							)}
						</nav>

						{/* Colonne 3 : Ressources détaillées du module sélectionné */}
						<div className="flex-1 flex flex-col min-w-0 overflow-y-auto p-4 gap-4 bg-background/30">
							{activeChapter ? (
								<>
									<div className="flex items-center justify-between border-b border-border pb-3">
										<div>
											<h3 className="font-title text-base tracking-tight text-foreground">
												Module {activeChapter.moduleNumber} : {activeChapter.title}
											</h3>
											<p className="text-xs text-muted-foreground">
												Sélectionnez les contenus à joindre au tuteur IA.
											</p>
										</div>
										{activeChapterPaths.length > 0 && (
											<button
												type="button"
												onClick={toggleAllActiveChapter}
												className="flex items-center gap-1.5 font-mono text-xs text-muted-foreground hover:text-foreground cursor-pointer transition-colors"
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
										<div className="flex flex-col gap-2">
											<div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
												<SparklesIcon className="size-3" />
												<span>Mode d'emploi & Synthèse IA du Module</span>
											</div>
											<label
												className={`flex items-start gap-3 rounded-md border p-3 transition-colors cursor-pointer ${
													checkedPaths.has(activeChapter.guide.absolutePath)
														? "border-foreground/30 bg-accent text-foreground"
														: "border-border bg-card hover:bg-accent/40"
												}`}
											>
												<input
													type="checkbox"
													checked={checkedPaths.has(activeChapter.guide.absolutePath)}
													onChange={() => togglePath(activeChapter.guide!.absolutePath)}
													className="mt-0.5 accent-foreground size-4 rounded-xs border-border cursor-pointer"
												/>
												<div className="flex-1 text-xs">
													<div className="font-medium flex items-center gap-2">
														<span>{activeChapter.guide.title}</span>
														<span className="rounded-xs border border-border bg-background px-1.5 py-0.2 font-mono text-[9px] text-muted-foreground">
															{activeChapter.guide.actionsCount} concepts / commandes
														</span>
													</div>
													<p className="mt-1 text-[11px] text-muted-foreground">
														Fiche Markdown autonome contenant l'intégralité des commandes de terminal, règles de conception, exemples et astuces d'examen.
													</p>
												</div>
											</label>
										</div>
									)}

									{/* 2. Supports de Cours & TPs PDF */}
									{activeChapter.resources.filter((r) => r.isPdf).length > 0 && (
										<div className="flex flex-col gap-2">
											<div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
												<FileTextIcon className="size-3" />
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
																className={`flex items-center gap-3 rounded-md border px-3 py-2 text-xs transition-colors cursor-pointer ${
																	checked
																		? "border-foreground/30 bg-accent text-foreground"
																		: "border-border bg-card hover:bg-accent/40"
																}`}
															>
																<input
																	type="checkbox"
																	checked={checked}
																	onChange={() => togglePath(path)}
																	className="accent-foreground size-4 rounded-xs border-border cursor-pointer"
																/>
																<span className="font-mono text-[11px] text-muted-foreground shrink-0">PDF</span>
																<span className="truncate flex-1 font-medium">
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
										<div className="flex flex-col gap-2">
											<div className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
												<BookOpenIcon className="size-3" />
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
																className={`flex items-center gap-3 rounded-md border px-3 py-2 text-xs transition-colors cursor-pointer ${
																	checked
																		? "border-foreground/30 bg-accent text-foreground"
																		: "border-border bg-card hover:bg-accent/40"
																}`}
															>
																<input
																	type="checkbox"
																	checked={checked}
																	onChange={() => togglePath(path)}
																	className="accent-foreground size-4 rounded-xs border-border cursor-pointer"
																/>
																<span className="font-mono text-[11px] text-muted-foreground shrink-0">MD</span>
																<span className="truncate flex-1 font-medium">
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
											<div className="py-12 text-center font-mono text-xs text-muted-foreground">
												Ce module ne contient encore aucun fichier dans Babel ICS.
											</div>
										)}
								</>
							) : (
								<div className="flex flex-1 items-center justify-center font-mono text-xs text-muted-foreground">
									Sélectionnez un module pour afficher ses fichiers.
								</div>
							)}
						</div>
					</>
				)}
			</div>

			{/* Bottom Action Footer */}
			<footer className="flex shrink-0 items-center justify-between border-t border-border px-5 py-3 bg-card">
				<div className="font-mono text-xs text-muted-foreground">
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
						className="rounded-md border border-border px-3.5 py-1.5 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground cursor-pointer transition-colors"
					>
						Annuler
					</button>
					<button
						type="button"
						disabled={checkedPaths.size === 0}
						onClick={handleConfirm}
						className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
					>
						{checkedPaths.size > 0
							? `Joindre à la session (${checkedPaths.size})`
							: "Joindre à la session"}
					</button>
				</div>
			</footer>
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
