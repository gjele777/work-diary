import { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  Alert,
  CircularProgress,
  Button,
  Checkbox,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  ListItemSecondaryAction,
  IconButton as MuiIconButton,
} from '@mui/material';
import {
  Favorite,
  ThumbUp,
  Celebration,
  EmojiEmotions,
  Add as AddIcon,
  Delete as DeleteIcon,
  ExpandLess,
  ExpandMore,
} from '@mui/icons-material';
import { format } from 'date-fns';
import { useDiaryStore } from '../stores/diaryStore';
import { useAuthStore } from '../stores/authStore';
import debounce from 'lodash/debounce';

const YourWorkDiary = () => {
  const {
    entries,
    loading,
    error,
    isSaving,
    fetchEntries,
    createOrUpdateEntry,
    addComment,
    addReaction,
    addTodo,
    toggleTodo,
    deleteTodo,
  } = useDiaryStore();
  const user = useAuthStore((state) => state.user);
  const [content, setContent] = useState('');
  const [commentContent, setCommentContent] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const [showAllComments, setShowAllComments] = useState(true);
  const commentsRef = useRef<HTMLDivElement>(null);
  const INITIAL_COMMENTS_HEIGHT = 150;
  const [newTodo, setNewTodo] = useState('');

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newContent = e.target.value;
    setContent(newContent);
    setLocalError(null);

    if (todayEntry && user) {
      // Create optimistic update while preserving all existing data including original creator
      const optimisticEntry = {
        ...todayEntry,
        content: newContent,
        updatedAt: new Date().toISOString(),
        // Keep all existing data with their original creators
        comments: todayEntry.comments,
        reactions: todayEntry.reactions,
        todos: todayEntry.todos,
        // Keep the original creator's userId
        userId: todayEntry.userId
      };

      // Update store immediately without triggering a re-fetch
      useDiaryStore.setState(state => ({
        entries: state.entries.map(entry => 
          entry._id === todayEntry._id ? optimisticEntry : entry
        )
      }));

      // Debounced save to server
      if (newContent.trim()) {
        debouncedSave(newContent);
      }
    }
  };

  const debouncedSave = useCallback(
    debounce(async (newContent: string) => {
      try {
        await createOrUpdateEntry(newContent);
        setSuccessMessage('Saved');
        setLocalError(null);
        setTimeout(() => setSuccessMessage(''), 2000);
      } catch (err) {
        console.error('Error saving diary entry:', err);
        setLocalError('Failed to save. Your changes are preserved and will be saved when connection is restored.');
      }
    }, 1000),
    []
  );

  const todayEntry = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return entries.find(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
  }, [entries]);

  useEffect(() => {
    // Clear all states when mounting
    setContent('');
    setCommentContent('');
    setSuccessMessage('');
    setLocalError(null);
    
    useDiaryStore.setState({ 
      entries: [],
      currentEntry: null,
      error: null,
      selectedDate: null // Also reset selected date
    });
    
    fetchEntries(1);

    // Cleanup when unmounting or route changes
    return () => {
      setContent('');
      setCommentContent('');
      useDiaryStore.setState({ 
        entries: [],
        currentEntry: null,
        selectedDate: null
      });
    };
  }, [fetchEntries]);

  useEffect(() => {
    if (todayEntry?.content && !content) {
      // Only set content if we're sure it's the user's entry
      if (todayEntry.userId._id === useAuthStore.getState().user?.id) {
        setContent(todayEntry.content);
      }
    }
  }, [todayEntry, content]);

  useEffect(() => {
    // Check if comments overflow the initial height
    if (commentsRef.current && todayEntry?.comments) {
      const hasOverflow = commentsRef.current.scrollHeight > INITIAL_COMMENTS_HEIGHT;
      setShowAllComments(true);
    }
  }, [todayEntry?.comments]);

  const scrollToBottom = () => {
    if (commentsRef.current) {
      commentsRef.current.scrollTop = commentsRef.current.scrollHeight;
    }
  };

  // Scroll to bottom when comments change
  useEffect(() => {
    scrollToBottom();
  }, [todayEntry?.comments]);

  const handleComment = async () => {
    if (!todayEntry || !commentContent.trim() || !user) return;

    try {
      // Create optimistic comment with current user as creator
      const optimisticComment = {
        _id: `temp-${Date.now()}`,
        content: commentContent,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email
        },
        createdAt: new Date().toISOString()
      };

      // Update state optimistically
      useDiaryStore.setState(state => ({
        entries: state.entries.map(entry => {
          if (entry._id === todayEntry._id) {
            return {
              ...entry,
              comments: [...entry.comments, optimisticComment]
            };
          }
          return entry;
        })
      }));

      // Clear input immediately for better UX
      setCommentContent('');
      
      // Make API call
      await addComment(todayEntry._id, commentContent);
      setSuccessMessage('Comment added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
      scrollToBottom();
    } catch (err) {
      console.error('Error adding comment:', err);
      // Revert optimistic update on error
      useDiaryStore.setState(state => ({
        entries: state.entries.map(entry => {
          if (entry._id === todayEntry._id) {
            return {
              ...entry,
              comments: entry.comments.filter(c => !c._id?.startsWith('temp-'))
            };
          }
          return entry;
        })
      }));
    }
  };

  const handleReaction = async (type: 'like' | 'heart' | 'celebrate' | 'support') => {
    if (!todayEntry) return;
    try {
      await addReaction(todayEntry._id, type);
    } catch (err) {
      console.error('Error adding reaction:', err);
    }
  };

  const getReactionIcon = (type: string) => {
    switch (type) {
      case 'heart':
        return <Favorite />;
      case 'like':
        return <ThumbUp />;
      case 'celebrate':
        return <Celebration />;
      case 'support':
        return <EmojiEmotions />;
      default:
        return null;
    }
  };

  const handleAddTodo = async () => {
    if (!todayEntry || !newTodo.trim() || !user) return;

    try {
      // Create optimistic todo with current user as creator
      const optimisticTodo = {
        content: newTodo,
        completed: false,
        userId: {
          _id: user.id,
          name: user.name,
          email: user.email
        },
        createdAt: new Date().toISOString()
      };

      // Update state optimistically
      useDiaryStore.setState(state => ({
        entries: state.entries.map(entry => {
          if (entry._id === todayEntry._id) {
            return {
              ...entry,
              todos: Array.isArray(entry.todos) ? [...entry.todos, optimisticTodo] : [optimisticTodo]
            };
          }
          return entry;
        })
      }));

      // Clear input immediately
      setNewTodo('');
      
      // Make API call
      await addTodo(todayEntry._id, newTodo);
      setSuccessMessage('Todo added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (err) {
      console.error('Error adding todo:', err);
      setLocalError('Failed to add todo');
      setTimeout(() => setLocalError(null), 3000);
      // Revert optimistic update on error
      useDiaryStore.setState(state => ({
        entries: state.entries.map(entry => {
          if (entry._id === todayEntry._id) {
            return {
              ...entry,
              todos: Array.isArray(entry.todos) ? entry.todos.slice(0, -1) : []
            };
          }
          return entry;
        })
      }));
    }
  };

  const handleToggleTodo = async (index: number) => {
    if (!todayEntry) return;
    try {
      await toggleTodo(todayEntry._id, index);
    } catch (err) {
      console.error('Error toggling todo:', err);
      setLocalError('Failed to toggle todo');
      setTimeout(() => setLocalError(null), 3000);
    }
  };

  const handleDeleteTodo = async (index: number) => {
    if (!todayEntry) return;
    try {
      await deleteTodo(todayEntry._id, index);
    } catch (err) {
      console.error('Error deleting todo:', err);
      setLocalError('Failed to delete todo');
      setTimeout(() => setLocalError(null), 3000);
    }
  };

  if (loading && !content) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 180px)',
      display: 'flex',
      gap: 2,
      overflow: 'hidden',
    }}>
      <Card sx={{ 
        flex: 2,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        <CardContent sx={{ 
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          p: 2,
          '&:last-child': { pb: 2 },
          overflow: 'hidden'
        }}>
          <Box sx={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            mb: 1.5,
            flexShrink: 0
          }}>
            <Typography variant="h6">
              Your Work Diary
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {isSaving && <CircularProgress size={16} />}
              {successMessage && (
                <Typography variant="caption" color="success.main">
                  {successMessage}
                </Typography>
              )}
              {localError && (
                <Typography variant="caption" color="error">
                  {localError}
                </Typography>
              )}
            </Box>
          </Box>

          <TextField
            multiline
            value={content}
            onChange={handleContentChange}
            placeholder="Write your diary entry..."
            disabled={loading}
            sx={{ 
              mb: 1.5,
              flex: 1,
              '& .MuiInputBase-root': {
                height: '100%'
              },
              '& .MuiInputBase-input': {
                height: '100% !important',
                overflow: 'auto !important'
              }
            }}
          />

          <Box sx={{ 
            borderTop: 1,
            borderColor: 'divider',
            pt: 1.5,
            display: 'flex',
            flexDirection: 'column',
            flex: 1,
            minHeight: 0
          }}>
            {todayEntry && todayEntry.comments.length > 0 && (
              <Box sx={{ 
                flex: 1,
                minHeight: 0,
                mb: 2
              }}>
                <Box
                  ref={commentsRef}
                  sx={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    height: '100%',
                    overflowY: 'auto',
                    pr: 1,
                    scrollBehavior: 'smooth',
                    '&::-webkit-scrollbar': {
                      width: '6px',
                    },
                    '&::-webkit-scrollbar-track': {
                      backgroundColor: 'background.paper',
                    },
                    '&::-webkit-scrollbar-thumb': {
                      backgroundColor: 'grey.300',
                      borderRadius: '3px',
                    },
                  }}
                >
                  {todayEntry.comments.map((comment, index) => (
                    <Box 
                      key={index} 
                      sx={{ 
                        p: 1,
                        backgroundColor: 'background.default',
                        borderRadius: 1,
                        '&:hover': {
                          backgroundColor: 'action.hover'
                        }
                      }}
                    >
                      <Box sx={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: 1
                      }}>
                        <Avatar sx={{ 
                          width: 24, 
                          height: 24,
                          bgcolor: 'primary.main'
                        }}>
                          {comment.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                        </Avatar>
                        <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                          {comment.userId?.name || 'Anonymous'}
                        </Typography>
                        <Typography 
                          variant="caption" 
                          sx={{ 
                            color: 'text.secondary',
                            ml: 'auto'
                          }}
                        >
                          {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                        </Typography>
                      </Box>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          pl: 4,
                          color: 'text.primary'
                        }}
                      >
                        {comment.content}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            )}
            <Box sx={{ 
              display: 'flex', 
              gap: 1,
              flexShrink: 0,
              pt: 1
            }}>
              <TextField
                size="small"
                fullWidth
                placeholder="Add a comment..."
                value={commentContent}
                onChange={(e) => setCommentContent(e.target.value)}
                sx={{ 
                  '& .MuiInputBase-root': {
                    fontSize: '0.875rem'
                  }
                }}
              />
              <Button
                variant="contained"
                onClick={handleComment}
                disabled={!commentContent.trim()}
                size="small"
              >
                Comment
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ 
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minWidth: '300px'
      }}>
        <CardContent sx={{
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          p: 3,
          '&:last-child': { pb: 3 },
          overflow: 'hidden'
        }}>
          <Typography variant="h6" sx={{ mb: 2, flexShrink: 0 }}>
            Today's Tasks
          </Typography>

          <Box sx={{ 
            display: 'flex', 
            gap: 1, 
            mb: 2,
            flexShrink: 0 
          }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Add a new task..."
              value={newTodo}
              onChange={(e) => setNewTodo(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === 'Enter' && newTodo.trim()) {
                  handleAddTodo();
                }
              }}
            />
            <IconButton 
              size="small" 
              onClick={handleAddTodo}
              disabled={!newTodo.trim()}
            >
              <AddIcon />
            </IconButton>
          </Box>

          <List sx={{ 
            flex: 1,
            overflowY: 'auto',
            minHeight: 0
          }}>
            {todayEntry?.todos.map((todo, index) => (
              <ListItem
                key={index}
                dense
                sx={{
                  textDecoration: todo.completed ? 'line-through' : 'none',
                  opacity: todo.completed ? 0.7 : 1,
                }}
              >
                <ListItemIcon>
                  <Checkbox
                    edge="start"
                    checked={todo.completed}
                    onChange={() => handleToggleTodo(index)}
                  />
                </ListItemIcon>
                <ListItemText 
                  primary={todo.content}
                  primaryTypographyProps={{
                    style: {
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }
                  }}
                />
                <ListItemSecondaryAction>
                  <MuiIconButton
                    edge="end"
                    size="small"
                    onClick={() => handleDeleteTodo(index)}
                  >
                    <DeleteIcon fontSize="small" />
                  </MuiIconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>

          <Box sx={{ 
            mt: 2, 
            pt: 2, 
            borderTop: 1, 
            borderColor: 'divider',
            flexShrink: 0 
          }}>
            <Typography variant="caption" color="text.secondary">
              {todayEntry?.todos.filter(t => t.completed).length || 0} of {todayEntry?.todos.length || 0} tasks completed
            </Typography>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default YourWorkDiary; 