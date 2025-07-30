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

export const DebugPanel: React.FC = () => {
    const { allErrors, getErrorCount, getSlideErrors, isLinting, lintSlide } =
        useLinting();
    const { selectedSlide } = usePresentation();
    const [isOpen, setIsOpen] = useState(false);
    const [selectedTab, setSelectedTab] = useState<'linting' | 'slide'>(
        'linting',
    );
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
    const [copied, setCopied] = useState(false);
    const handleCopy = () => {
        if (selectedSlide) {
            navigator.clipboard.writeText(
                JSON.stringify(selectedSlide, null, 2),
            );
            setCopied(true);
            setTimeout(() => setCopied(false), 1000);
        }
    };
    const handleRunLinting = async () => {
        if (selectedSlide) {
            await lintSlide(selectedSlide);
        }
    };
    const openPanel = () => setIsOpen(true);
    const isDev = process.env.NODE_ENV === 'development';
    if (!isDev) return null;
    if (!isOpen) {
        return (
            <button
                type="button"
                style={{
                    position: 'fixed',
                    bottom: '20px',
                    left: '20px',
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
                width: '500px',
                maxHeight: '600px',
                zIndex: 1000,
                backgroundColor: '#f9fafb',
                border: '1px solid #e5e7eb',
                borderRadius: '8px',
                boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
            }}
        >
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
                    <span style={{ fontSize: '16px' }}>🛠️</span>
                    <span style={{ fontWeight: '600', fontSize: '14px' }}>
                        Debug Panel
                    </span>
                </div>
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
            <div
                style={{
                    display: 'flex',
                    borderBottom: '1px solid #e5e7eb',
                    background: '#fff',
                }}
            >
                <button
                    type="button"
                    onClick={() => setSelectedTab('linting')}
                    style={{
                        flex: 1,
                        padding: '10px 0',
                        background:
                            selectedTab === 'linting'
                                ? '#3b82f6'
                                : 'transparent',
                        color: selectedTab === 'linting' ? 'white' : '#6b7280',
                        border: 'none',
                        fontWeight: selectedTab === 'linting' ? 600 : 400,
                        cursor: 'pointer',
                    }}
                >
                    Linting
                </button>
                <button
                    type="button"
                    onClick={() => setSelectedTab('slide')}
                    style={{
                        flex: 1,
                        padding: '10px 0',
                        background:
                            selectedTab === 'slide' ? '#3b82f6' : 'transparent',
                        color: selectedTab === 'slide' ? 'white' : '#6b7280',
                        border: 'none',
                        fontWeight: selectedTab === 'slide' ? 600 : 400,
                        cursor: 'pointer',
                    }}
                >
                    Get Slide Data
                </button>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', background: '#f9fafb' }}>
                {selectedTab === 'linting' && (
                    <>
                        <div
                            style={{
                                padding: '8px 16px',
                                borderBottom: '1px solid #e5e7eb',
                                background: '#fff',
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
                                    const isActive =
                                        selectedSeverity === severity;
                                    return (
                                        <button
                                            key={severity}
                                            type="button"
                                            onClick={() =>
                                                setSelectedSeverity(severity)
                                            }
                                            style={{
                                                padding: '4px 8px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                fontSize: '12px',
                                                fontWeight: isActive
                                                    ? '600'
                                                    : '400',
                                                backgroundColor: isActive
                                                    ? '#3b82f6'
                                                    : 'transparent',
                                                color: isActive
                                                    ? 'white'
                                                    : '#6b7280',
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
                                    marginLeft: 'auto',
                                }}
                            >
                                {isLinting ? '⏳' : '🔄'} Run Lint
                            </button>
                        </div>
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
                                                    (error: LintingError) =>
                                                        selectedSeverity ===
                                                            'all' ||
                                                        error.severity ===
                                                            selectedSeverity,
                                                )
                                                .map((error: LintingError) => (
                                                    <ErrorItem
                                                        key={error.id}
                                                        error={error}
                                                        onElementClick={() => {}}
                                                    />
                                                ))}
                                        </div>
                                    )}
                                    {filteredErrors.filter(
                                        (error: LintingError) =>
                                            !currentSlideErrors.includes(error),
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
                                                        (error: LintingError) =>
                                                            !currentSlideErrors.includes(
                                                                error,
                                                            ),
                                                    ).length
                                                }
                                                )
                                            </h4>
                                            {filteredErrors
                                                .filter(
                                                    (error: LintingError) =>
                                                        !currentSlideErrors.includes(
                                                            error,
                                                        ),
                                                )
                                                .map((error: LintingError) => (
                                                    <ErrorItem
                                                        key={error.id}
                                                        error={error}
                                                        onElementClick={() => {}}
                                                    />
                                                ))}
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </>
                )}
                {selectedTab === 'slide' && (
                    <div style={{ padding: '16px' }}>
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                marginBottom: '8px',
                                gap: '8px',
                            }}
                        >
                            <span style={{ fontWeight: 600, fontSize: '14px' }}>
                                Current Slide Data
                            </span>
                            <button
                                type="button"
                                onClick={handleCopy}
                                disabled={!selectedSlide}
                                style={{
                                    background: selectedSlide
                                        ? '#3b82f6'
                                        : '#e5e7eb',
                                    color: selectedSlide ? 'white' : '#6b7280',
                                    border: 'none',
                                    borderRadius: '4px',
                                    padding: '2px 8px',
                                    fontSize: '12px',
                                    cursor: selectedSlide
                                        ? 'pointer'
                                        : 'not-allowed',
                                }}
                            >
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                        <pre
                            style={{
                                background: '#f3f4f6',
                                borderRadius: '4px',
                                padding: '12px',
                                fontSize: '12px',
                                maxHeight: '350px',
                                overflow: 'auto',
                                color: '#000',
                            }}
                        >
                            {selectedSlide
                                ? JSON.stringify(selectedSlide, null, 2)
                                : 'No slide selected'}
                        </pre>
                    </div>
                )}
            </div>
        </div>
    );
};
