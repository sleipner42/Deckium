import {
    Assignment as AssignmentIcon,
    Cancel as CancelIcon,
    Close as CloseIcon,
    Link as LinkIcon,
    Pause as PauseIcon,
    PlayArrow as PlayIcon,
    Refresh as RefreshIcon,
    Schedule as ScheduleIcon,
    Stop as StopIcon,
} from '@mui/icons-material';
import {
    Alert,
    Box,
    Button,
    Card,
    CardActions,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    IconButton,
    LinearProgress,
    Stack,
    Tab,
    Tabs,
    Typography,
} from '@mui/material';
import React, { useEffect, useState } from 'react';
import {
    Task,
    TaskPriority,
    TaskStatus,
    TaskType,
} from '../../../../common/domain/entities/task-types';
import { useTaskManager } from '../../hooks/useTaskManager';

interface TaskProgressPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

export const TaskProgressPanel: React.FC<TaskProgressPanelProps> = ({
    isOpen,
    onClose,
}) => {
    const { tasks, cancelTask, getTaskHistory } = useTaskManager();
    const [activeTab, setActiveTab] = useState<'active' | 'completed' | 'all'>(
        'active',
    );
    const [taskHistory, setTaskHistory] = useState<Task[]>([]);

    useEffect(() => {
        if (isOpen) {
            loadTaskHistory();
        }
    }, [isOpen]);

    const loadTaskHistory = async () => {
        const history = await getTaskHistory();
        setTaskHistory(history);
    };

    const getStatusColor = (
        status: TaskStatus,
    ):
        | 'default'
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning' => {
        switch (status) {
            case TaskStatus.PENDING:
                return 'warning';
            case TaskStatus.RUNNING:
                return 'info';
            case TaskStatus.COMPLETED:
                return 'success';
            case TaskStatus.FAILED:
                return 'error';
            case TaskStatus.CANCELLED:
                return 'default';
            case TaskStatus.PAUSED:
                return 'warning';
            default:
                return 'default';
        }
    };

    const getPriorityColor = (
        priority: TaskPriority,
    ):
        | 'default'
        | 'primary'
        | 'secondary'
        | 'error'
        | 'info'
        | 'success'
        | 'warning' => {
        switch (priority) {
            case TaskPriority.URGENT:
                return 'error';
            case TaskPriority.HIGH:
                return 'warning';
            case TaskPriority.MEDIUM:
                return 'info';
            case TaskPriority.LOW:
                return 'default';
            default:
                return 'default';
        }
    };

    const getTypeIcon = (type: TaskType): React.ReactNode => {
        switch (type) {
            case TaskType.IMMEDIATE:
                return <PlayIcon />;
            case TaskType.BACKGROUND:
                return <RefreshIcon />;
            case TaskType.SCHEDULED:
                return <ScheduleIcon />;
            case TaskType.DEPENDENT:
                return <LinkIcon />;
            case TaskType.WORKFLOW:
                return <AssignmentIcon />;
            default:
                return <AssignmentIcon />;
        }
    };

    const getFilteredTasks = (): Task[] => {
        const allTasks = [...tasks, ...taskHistory];

        switch (activeTab) {
            case 'active':
                return allTasks.filter(
                    (task) =>
                        task.status === TaskStatus.PENDING ||
                        task.status === TaskStatus.RUNNING ||
                        task.status === TaskStatus.PAUSED,
                );
            case 'completed':
                return allTasks.filter(
                    (task) =>
                        task.status === TaskStatus.COMPLETED ||
                        task.status === TaskStatus.FAILED ||
                        task.status === TaskStatus.CANCELLED,
                );
            case 'all':
                return allTasks;
            default:
                return allTasks;
        }
    };

    const TaskItem: React.FC<{ task: Task }> = ({ task }) => {
        const progressPercentage =
            task.progress.total > 0
                ? (task.progress.current / task.progress.total) * 100
                : 0;

        return (
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Box display="flex" alignItems="center" gap={1}>
                            <Box
                                sx={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    color: 'text.secondary',
                                }}
                            >
                                {getTypeIcon(task.type)}
                            </Box>
                            <Typography variant="subtitle1" fontWeight="medium">
                                {task.name}
                            </Typography>
                            <Chip
                                label={task.priority.toUpperCase()}
                                size="small"
                                color={getPriorityColor(task.priority)}
                            />
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                            <Chip
                                label={task.status.toUpperCase()}
                                size="small"
                                color={getStatusColor(task.status)}
                            />
                            {(task.status === TaskStatus.PENDING ||
                                task.status === TaskStatus.RUNNING) && (
                                <IconButton
                                    size="small"
                                    onClick={() => cancelTask(task.id)}
                                    color="error"
                                >
                                    <CancelIcon />
                                </IconButton>
                            )}
                        </Box>
                    </Box>

                    {task.description && (
                        <Typography
                            variant="body2"
                            color="text.secondary"
                            mb={1}
                        >
                            {task.description}
                        </Typography>
                    )}

                    {task.status === TaskStatus.RUNNING && (
                        <Box mb={2}>
                            <Box
                                display="flex"
                                alignItems="center"
                                justifyContent="space-between"
                                mb={1}
                            >
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    Progress
                                </Typography>
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                >
                                    {Math.round(progressPercentage)}%
                                </Typography>
                            </Box>
                            <LinearProgress
                                variant="determinate"
                                value={progressPercentage}
                                sx={{ height: 6, borderRadius: 3 }}
                            />
                            {task.progress.message && (
                                <Typography
                                    variant="caption"
                                    color="text.secondary"
                                    mt={1}
                                >
                                    {task.progress.message}
                                </Typography>
                            )}
                        </Box>
                    )}

                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        mb={1}
                    >
                        <Typography variant="caption" color="text.secondary">
                            Tool: {task.toolName}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            Created: {task.createdAt.toLocaleTimeString()}
                        </Typography>
                    </Box>

                    {task.result && !task.result.success && (
                        <Alert severity="error" sx={{ mt: 1 }}>
                            <Typography variant="caption">
                                Error: {task.result.error}
                            </Typography>
                        </Alert>
                    )}

                    {task.tags.length > 0 && (
                        <Stack
                            direction="row"
                            spacing={1}
                            flexWrap="wrap"
                            mt={1}
                        >
                            {task.tags.map((tag) => (
                                <Chip
                                    key={tag}
                                    label={tag}
                                    size="small"
                                    variant="outlined"
                                />
                            ))}
                        </Stack>
                    )}
                </CardContent>
            </Card>
        );
    };

    return (
        <Dialog
            open={isOpen}
            onClose={onClose}
            maxWidth="lg"
            fullWidth
            PaperProps={{
                sx: { height: '80vh', maxHeight: '800px' },
            }}
        >
            <DialogTitle>
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                >
                    <Typography variant="h6">Task Manager</Typography>
                    <IconButton onClick={onClose} size="small">
                        <CloseIcon />
                    </IconButton>
                </Box>
            </DialogTitle>

            <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
                <Tabs
                    value={activeTab}
                    onChange={(_, newValue) => setActiveTab(newValue)}
                    aria-label="task tabs"
                >
                    <Tab label="Active Tasks" value="active" />
                    <Tab label="Completed Tasks" value="completed" />
                    <Tab label="All Tasks" value="all" />
                </Tabs>
            </Box>

            <DialogContent sx={{ flex: 1, overflow: 'auto' }}>
                {getFilteredTasks().length === 0 ? (
                    <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        height="200px"
                    >
                        <Typography variant="body1" color="text.secondary">
                            No tasks found
                        </Typography>
                    </Box>
                ) : (
                    <Stack spacing={0}>
                        {getFilteredTasks().map((task) => (
                            <TaskItem key={task.id} task={task} />
                        ))}
                    </Stack>
                )}
            </DialogContent>

            <DialogActions>
                <Box
                    display="flex"
                    alignItems="center"
                    justifyContent="space-between"
                    width="100%"
                >
                    <Typography variant="body2" color="text.secondary">
                        {getFilteredTasks().length} task
                        {getFilteredTasks().length !== 1 ? 's' : ''}
                    </Typography>
                    <Button
                        onClick={loadTaskHistory}
                        startIcon={<RefreshIcon />}
                        size="small"
                    >
                        Refresh
                    </Button>
                </Box>
            </DialogActions>
        </Dialog>
    );
};
