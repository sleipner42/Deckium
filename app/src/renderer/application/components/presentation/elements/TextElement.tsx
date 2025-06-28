import { Box } from "@mui/material";
import Quill from "quill";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { TextBox } from "../../../../../common/domain/entities/types";
import { useTextEditing } from "../../../context/TextEditingContext";
import { ResizeHandles } from "../ResizeHandles";

const SizeStyle = Quill.import("attributors/style/size") as any;
SizeStyle.whitelist = [
	"8px",
	"10px",
	"12px",
	"14px",
	"16px",
	"18px",
	"20px",
	"24px",
	"28px",
	"32px",
	"36px",
	"48px",
];
Quill.register(SizeStyle, true);

const toolbarStyles = `
  .ql-toolbar {
    z-index: 9999 !important;
    position: relative !important;
  }
  .ql-picker-options {
    z-index: 10000 !important;
  }
`;

if (!document.querySelector("#quill-toolbar-zindex")) {
	const style = document.createElement("style");
	style.id = "quill-toolbar-zindex";
	style.textContent = toolbarStyles;
	document.head.appendChild(style);
}

interface TextElementProps {
	element: TextBox;
	onClick: () => void;
	onContextMenu?: (event: React.MouseEvent) => void;
	isSelected: boolean;
	isEditing: boolean;
	onStartEditing: () => void;
	onStopEditing: (content?: string) => void;
	onElementUpdate?: (elementId: string, updates: Partial<TextBox>) => void;
	readOnly?: boolean;
}

export const TextElement: React.FC<TextElementProps> = ({
	element,
	onClick,
	onContextMenu,
	isSelected,
	isEditing,
	onStartEditing,
	onStopEditing,
	onElementUpdate,
	readOnly = false,
}) => {
	const {
		position,
		size,
		content,
		color,
		style,
		backgroundColor,
		borderRadius,
		align,
		verticalAlign,
		zIndex,
	} = element;
	const textRef = useRef<HTMLDivElement>(null);
	const quillRef = useRef<Quill | null>(null);
	const [preventBlur, setPreventBlur] = useState(false);
	const [isDragging, setIsDragging] = useState(false);
	const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
	const { setActiveEditor } = useTextEditing();

	useEffect(() => {
		if (textRef.current && !quillRef.current) {
			try {
				const quill = new Quill(textRef.current, {
					theme: "snow",
					modules: {
						toolbar: [
							[{ header: [1, 2, 3, false] }],
							[
								{ font: [] },
								{
									size: [
										"8px",
										"10px",
										"12px",
										"14px",
										"16px",
										"18px",
										"20px",
										"24px",
										"28px",
										"32px",
										"36px",
										"48px",
									],
								},
							],
							["bold", "italic", "underline", "strike"],
							[{ color: [] }, { background: [] }],
							[{ list: "ordered" }, { list: "bullet" }],
							["link"],
							[{ align: [] }],
							["clean"],
						],
					},
					formats: [
						"header",
						"font",
						"size",
						"bold",
						"italic",
						"underline",
						"strike",
						"list",
						"link",
						"align",
						"color",
						"background",
						"code",
						"formula",
					],
				});

				if (content) {
					quill.clipboard.dangerouslyPasteHTML(content);
				}

				const toolbar = quill.getModule("toolbar");
				if (toolbar?.container) {
					const handleToolbarClick = (e: Event) => {
						e.stopPropagation();
						setPreventBlur(true);

						setTimeout(() => setPreventBlur(false), 300);
					};

					const handleToolbarMouseDown = (_e: Event) => {
						setPreventBlur(true);
					};

					toolbar.container.addEventListener(
						"mousedown",
						handleToolbarMouseDown,
						true,
					);
					toolbar.container.addEventListener(
						"click",
						handleToolbarClick,
						false,
					);
				}

				quillRef.current = quill;
			} catch (error) {
				console.error("Failed to initialize Quill editor:", error);
			}
		}

		if (quillRef.current) {
			if (isEditing) {
				quillRef.current.enable();
				const toolbar = quillRef.current.getModule("toolbar");
				if (toolbar?.container) {
					toolbar.container.style.display = "block";
				}
				setActiveEditor(quillRef.current);
				setPreventBlur(true);
				setTimeout(() => {
					setPreventBlur(false);
					if (quillRef.current) {
						quillRef.current.focus();
					}
				}, 200);
			} else {
				quillRef.current.disable();
				const toolbar = quillRef.current.getModule("toolbar");
				if (toolbar?.container) {
					toolbar.container.style.display = "none";
				}
				setActiveEditor(null);
			}
		}
	}, [isEditing, setActiveEditor, content]);

	useEffect(() => {
		if (quillRef.current && content) {
			const currentContent = quillRef.current.root.innerHTML;

			if (currentContent !== content) {
				quillRef.current.clipboard.dangerouslyPasteHTML(content);
			}
		}
	}, [content]);

	useEffect(() => {
		if (!isEditing) return;

		const handleDocumentClick = (e: MouseEvent) => {
			setTimeout(() => {
				if (preventBlur) return;

				const target = e.target as HTMLElement;
				const quillContainer = textRef.current;

				const isWithinQuill = quillContainer?.contains(target);

				let isWithinToolbar = false;
				if (quillRef.current) {
					const toolbar = quillRef.current.getModule("toolbar");
					if (toolbar?.container) {
						isWithinToolbar = toolbar.container.contains(target);
					}
				}

				const isToolbarElement =
					target?.closest(".ql-toolbar") ||
					target?.closest(".ql-picker") ||
					target?.closest(".ql-picker-options") ||
					target?.closest(".ql-picker-item") ||
					target?.closest(".ql-picker-label") ||
					target?.closest(".ql-formats") ||
					target?.classList?.contains("ql-picker") ||
					target?.classList?.contains("ql-picker-label") ||
					target?.classList?.contains("ql-picker-item") ||
					target?.classList?.contains("ql-stroke") ||
					target?.classList?.contains("ql-fill") ||
					(target?.tagName === "svg" && target?.closest(".ql-toolbar"));

				if (
					!isWithinQuill &&
					!isWithinToolbar &&
					!isToolbarElement &&
					quillRef.current
				) {
					onStopEditing(quillRef.current.root.innerHTML);
				}
			}, 10);
		};

		const timeoutId = setTimeout(() => {
			document.addEventListener("click", handleDocumentClick, true);
		}, 50);

		return () => {
			clearTimeout(timeoutId);
			document.removeEventListener("click", handleDocumentClick, true);
		};
	}, [isEditing, preventBlur, onStopEditing]);

	const handleMouseDown = (e: React.MouseEvent) => {
		if (readOnly) return;

		const target = e.target as HTMLElement;
		if (target?.closest(".ql-toolbar")) {
			return;
		}

		if (isSelected && !isEditing) {
			e.stopPropagation();
			setIsDragging(true);
			setDragOffset({
				x: e.clientX - position.x,
				y: e.clientY - position.y,
			});
		}
	};

	const onElementUpdateRef = useRef(onElementUpdate);
	useEffect(() => {
		onElementUpdateRef.current = onElementUpdate;
	}, [onElementUpdate]);

	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging && onElementUpdateRef.current) {
				onElementUpdateRef.current(element.id, {
					position: {
						x: e.clientX - dragOffset.x,
						y: e.clientY - dragOffset.y,
					},
				});
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
		};

		if (isDragging) {
			document.addEventListener("mousemove", handleMouseMove);
			document.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, dragOffset, element.id]);

	const handleDoubleClick = (e: React.MouseEvent) => {
		if (readOnly) return;

		e.stopPropagation();
		onStartEditing();
	};

	const handleBlur = (e: React.FocusEvent) => {
		if (!preventBlur && isEditing && quillRef.current) {
			const relatedTarget = e.relatedTarget as HTMLElement;

			if (
				!relatedTarget ||
				(!relatedTarget.closest("[data-element-id]") &&
					!relatedTarget.closest(".ql-toolbar"))
			) {
				setTimeout(() => {
					if (quillRef.current && isEditing) {
						onStopEditing(quillRef.current.root.innerHTML);
					}
				}, 100);
			}
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Escape" && quillRef.current) {
			setPreventBlur(false);
			onStopEditing(quillRef.current.root.innerHTML);
		}
	};

	const handleClick = (e: React.MouseEvent) => {
		if (readOnly) return;

		const target = e.target as HTMLElement;
		if (target?.closest(".ql-toolbar")) {
			return;
		}

		e.stopPropagation();
		if (!isEditing) {
			onClick();
		}
	};

	const renderContent = () => {
		return <div style={{ height: "100%", width: "100%" }} />;
	};

	return (
		<Box
			ref={textRef}
			data-element-id={element.id}
			data-element-type="textbox"
			sx={{
				"& .ql-editor": {
					display: "flex !important",
					padding: "5px !important",
					alignItems:
						verticalAlign === "bottom"
							? "flex-end !important"
							: verticalAlign === "middle"
								? "center !important"
								: "flex-start !important",
					minHeight: "100% !important",
					overflow: "visible !important",
					"& ol": { paddingLeft: "0", fontSize: "inherit" },
				},
			}}
			style={{
				position: "absolute",
				left: `${position.x}px`,
				top: `${position.y}px`,
				width: `${size.width}px`,
				height: `${size.height}px`,
				maxHeight: `${size.height}px`,
				overflow: "visible",
				color,
				cursor: readOnly
					? "default"
					: isEditing
						? "text"
						: isSelected
							? "move"
							: "pointer",
				alignItems:
					align === "center"
						? "center"
						: align === "right"
							? "flex-end"
							: "flex-start",
				userSelect: isEditing ? "text" : "none",
				outline: isSelected && !isEditing ? "2px solid #0066ff" : "none",
				outlineOffset: "2px",
				padding: "0",
				border: "none",
				backgroundColor: backgroundColor || "transparent",
				borderRadius:
					borderRadius !== undefined ? `${borderRadius}px` : undefined,
				textAlign: align || "left",
				zIndex: zIndex || 1,
				...style,
			}}
			onDoubleClick={handleDoubleClick}
			onBlur={handleBlur}
			onKeyDown={handleKeyDown}
			onMouseDown={handleMouseDown}
			onClick={handleClick}
			onContextMenu={onContextMenu}
		>
			{renderContent()}
			<ResizeHandles
				isSelected={isSelected}
				isEditing={isEditing}
				elementId={element.id}
				position={position}
				size={size}
				onResize={
					onElementUpdate
						? (id, updates) => onElementUpdate(id, updates)
						: () => {}
				}
				minWidth={50}
				minHeight={30}
			/>
		</Box>
	);
};
