import React, { useMemo, useState } from 'react';
import { useLinting } from '../../context/LintingContext';
import { usePresentation } from '../../context/PresentationContext';

interface LintingError {
    id: string;
    elementId: string;
    slideId: string;
    type: string;
    message: string;
    severity: 'error' | 'warning' | 'info';
    suggestedFix?: string;
    createdAt: Date;
}

const getSeverityIcon = (severity: string) => {
    switch (severity) {
        case 'error':
            return '🔴';
        case 'warning':
            return '🟡';
        case 'info':
            return '🔵';
        default:
            return '⚪';
    }
};

const getSeverityColor = (severity: string) => {
    switch (severity) {
        case 'error':
            return '#ef4444';
        case 'warning':
            return '#f59e0b';
        case 'info':
            return '#3b82f6';
        default:
            return '#6b7280';
    }
};

const ErrorItem: React.FC<{
    error: LintingError;
    onElementClick?: (elementId: string) => void;
}> = ({ error, onElementClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleExpanded = () => setIsExpanded(!isExpanded);

    return (
        <button
            type="button"
            style={{
                padding: '8px 12px',
                margin: '4px 0',
                backgroundColor: '#ffffff',
                border: `1px solid ${getSeverityColor(error.severity)}20`,
                borderLeft: `3px solid ${getSeverityColor(error.severity)}`,
                borderRadius: '4px',
                fontSize: '13px',
                cursor: 'pointer',
                width: '100%',
                textAlign: 'left',
            }}
            onClick={toggleExpanded}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span>{getSeverityIcon(error.severity)}</span>
                <span style={{ fontWeight: '500', flex: 1 }}>
                    {error.message}
                </span>
                <span style={{ fontSize: '11px', color: '#6b7280' }}>
                    {isExpanded ? '▼' : '▶'}
                </span>
            </div>

            {isExpanded && (
                <div
                    style={{
                        marginTop: '8px',
                        paddingTop: '8px',
                        borderTop: '1px solid #e5e7eb',
                    }}
                >
                    <div style={{ marginBottom: '4px' }}>
                        <strong>Type:</strong> <code>{error.type}</code>
                    </div>
                    {error.elementId !== 'unknown' && (
                        <div style={{ marginBottom: '4px' }}>
                            <strong>Element:</strong>
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onElementClick?.(error.elementId);
                                }}
                                style={{
                                    marginLeft: '8px',
                                    padding: '2px 6px',
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    borderRadius: '2px',
                                    fontSize: '11px',
                                    cursor: 'pointer',
                                }}
                            >
                                {error.elementId.slice(0, 8)}...
                            </button>
                        </div>
                    )}
                    {error.suggestedFix && (
                        <div style={{ marginTop: '8px' }}>
                            <strong>💡 Suggestion:</strong>
                            <div
                                style={{
                                    marginTop: '4px',
                                    padding: '6px',
                                    backgroundColor: '#f3f4f6',
                                    borderRadius: '3px',
                                    fontSize: '12px',
                                    fontStyle: 'italic',
                                }}
                            >
                                {error.suggestedFix}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </button>
    );
};

export const LintingPanel: React.FC = () => {
    const { allErrors, getErrorCount, getSlideErrors, isLinting, lintSlide } =
        useLinting();
    const { selectedSlide, selectElement } = usePresentation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedSeverity, setSelectedSeverity] = useState<
        'all' | 'error' | 'warning' | 'info'
    >('all');

    const filteredErrors = useMemo(() => {
        if (selectedSeverity === 'all') return allErrors;
        return allErrors.filter((error) => error.severity === selectedSeverity);
    }, [allErrors, selectedSeverity]);

    const currentSlideErrors = selectedSlide
        ? getSlideErrors(selectedSlide.id)
        : [];
    const totalErrors = getErrorCount();
    const errorCount = getErrorCount('error');
    const warningCount = getErrorCount('warning');
    const infoCount = getErrorCount('info');

    const handleElementClick = (elementId: string) => {
        selectElement(elementId);
    };

    const handleRunLinting = async () => {
        if (selectedSlide) {
            await lintSlide(selectedSlide);
        }
    };

    const openPanel = () => setIsOpen(true);

    // Only show in development mode
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) return null;

    if (!isOpen) {
        return (
            <button
                type="button"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    right: '20px',
                    zIndex: 1000,
                    backgroundColor: totalErrors > 0 ? '#fee2e2' : '#f0fdf4',
                    border:
                        totalErrors > 0
                            ? '1px solid #fecaca'
                            : '1px solid #bbf7d0',
                    borderRadius: '8px',
                    padding: '8px 12px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '13px',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                }}
                onClick={openPanel}
            >
                {isLinting && <span>⏳</span>}
                <span>{totalErrors > 0 ? '🔍' : '✅'}</span>
                <span>
                    {totalErrors > 0 ? `${totalErrors} issues` : 'No issues'}
                </span>
                {totalErrors > 0 && (
                    <div
                        style={{
                            display: 'flex',
                            gap: '4px',
                            marginLeft: '4px',
                        }}
                    >
                        {errorCount > 0 && (
                            <span style={{ color: '#ef4444' }}>
                                ●{errorCount}
                            </span>
                        )}
                        {warningCount > 0 && (
                            <span style={{ color: '#f59e0b' }}>
                                ●{warningCount}
                            </span>
                        )}
                        {infoCount > 0 && (
                            <span style={{ color: '#3b82f6' }}>
                                ●{infoCount}
                            </span>
                        )}
                    </div>
                )}
            </button>
        );
    }

    return (
        <div
            style={{
                position: 'fixed',
                bottom: '20px',
                right: '20px',
                width: '400px',
                maxHeight: '500px',
                zIndex: 1000,
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
            }}
        >
            {/* Header */}
            <div
                style={{
                    padding: '12px 16px',
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                }}
            >
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <span style={{ fontSize: '16px' }}>🔍</span>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                        Linting ({totalErrors} issues)
                    </span>
                    {isLinting && (
                        <span style={{ fontSize: '12px' }}>⏳ Linting...</span>
                    )}
                </div>
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                    }}
                >
                    <button
                        type="button"
                        onClick={handleRunLinting}
                        disabled={!selectedSlide || isLinting}
                        style={{
                            background:
                                selectedSlide && !isLinting
                                    ? '#3b82f6'
                                    : '#e5e7eb',
                            color:
                                selectedSlide && !isLinting
                                    ? 'white'
                                    : '#6b7280',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 8px',
                            fontSize: '12px',
                            cursor:
                                selectedSlide && !isLinting
                                    ? 'pointer'
                                    : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                        }}
                    >
                        {isLinting ? '⏳' : '🔄'} Run Lint
                    </button>
                    <button
                        type="button"
                        onClick={() => setIsOpen(false)}
                        style={{
                            background: 'none',
                            border: 'none',
                            fontSize: '16px',
                            cursor: 'pointer',
                            color: '#6b7280',
                        }}
                    >
                        ✕
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div
                style={{
                    padding: '8px 16px',
                    backgroundColor: '#ffffff',
                    borderBottom: '1px solid #e5e7eb',
                    display: 'flex',
                    gap: '8px',
                }}
            >
                {(['all', 'error', 'warning', 'info'] as const).map(
                    (severity) => {
                        const count =
                            severity === 'all'
                                ? totalErrors
                                : getErrorCount(severity);
                        const isActive = selectedSeverity === severity;

                        return (
                            <button
                                key={severity}
                                type="button"
                                onClick={() => setSelectedSeverity(severity)}
                                style={{
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    border: 'none',
                                    fontSize: '12px',
                                    fontWeight: isActive ? '600' : '400',
                                    backgroundColor: isActive
                                        ? '#3b82f6'
                                        : 'transparent',
                                    color: isActive ? 'white' : '#6b7280',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}
                            >
                                {severity === 'all' && '📋'}
                                {severity === 'error' && '🔴'}
                                {severity === 'warning' && '🟡'}
                                {severity === 'info' && '🔵'}
                                {severity.charAt(0).toUpperCase() +
                                    severity.slice(1)}{' '}
                                ({count})
                            </button>
                        );
                    },
                )}
            </div>

            {/* Content */}
            <div
                style={{
                    maxHeight: '350px',
                    overflowY: 'auto',
                    padding: '8px',
                }}
            >
                {filteredErrors.length === 0 ? (
                    <div
                        style={{
                            textAlign: 'center',
                            padding: '32px 16px',
                            color: '#6b7280',
                            fontSize: '14px',
                        }}
                    >
                        {selectedSeverity === 'all' ? (
                            <>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        marginBottom: '8px',
                                    }}
                                >
                                    ✨
                                </div>
                                No linting issues found!
                            </>
                        ) : (
                            <>
                                <div
                                    style={{
                                        fontSize: '24px',
                                        marginBottom: '8px',
                                    }}
                                >
                                    🎯
                                </div>
                                No {selectedSeverity} issues found!
                            </>
                        )}
                    </div>
                ) : (
                    <>
                        {/* Current Slide Errors */}
                        {currentSlideErrors.length > 0 && (
                            <div style={{ marginBottom: '16px' }}>
                                <h4
                                    style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    📄 Current Slide (
                                    {currentSlideErrors.length})
                                </h4>
                                {currentSlideErrors
                                    .filter(
                                        (error) =>
                                            selectedSeverity === 'all' ||
                                            error.severity === selectedSeverity,
                                    )
                                    .map((error) => (
                                        <ErrorItem
                                            key={error.id}
                                            error={error}
                                            onElementClick={handleElementClick}
                                        />
                                    ))}
                            </div>
                        )}

                        {/* All Other Errors */}
                        {filteredErrors.filter(
                            (error) => !currentSlideErrors.includes(error),
                        ).length > 0 && (
                            <div>
                                <h4
                                    style={{
                                        margin: '0 0 8px 0',
                                        fontSize: '13px',
                                        fontWeight: '600',
                                        color: '#374151',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                    }}
                                >
                                    📚 Other Slides (
                                    {
                                        filteredErrors.filter(
                                            (error) =>
                                                !currentSlideErrors.includes(
                                                    error,
                                                ),
                                        ).length
                                    }
                                    )
                                </h4>
                                {filteredErrors
                                    .filter(
                                        (error) =>
                                            !currentSlideErrors.includes(error),
                                    )
                                    .map((error) => (
                                        <ErrorItem
                                            key={error.id}
                                            error={error}
                                            onElementClick={handleElementClick}
                                        />
                                    ))}
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
};
