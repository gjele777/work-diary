import { useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  IconButton,
  Avatar,
  Divider,
  Stack,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  Checkbox,
  ListItemText,
} from '@mui/material';
import {
  Favorite,
  ThumbUp,
  Celebration,
  EmojiEmotions,
  CalendarToday,
  ChevronLeft,
  ChevronRight,
} from '@mui/icons-material';
import { format, startOfWeek, addDays, isToday } from 'date-fns';
import { useDiaryStore } from '../stores/diaryStore';
import { useAuthStore } from '../stores/authStore';

const DiaryFeed = () => {
  const {
    entries,
    totalPages,
    currentPage,
    loading,
    error,
    fetchEntries,
    addComment,
    addReaction,
    selectedDate,
    setSelectedDate,
  } = useDiaryStore();
  const user = useAuthStore((state) => state.user);
  const [commentContent, setCommentContent] = useState<{ [key: string]: string }>({});
  const [isInitialized, setIsInitialized] = useState(false);
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));
  const [expandedComments, setExpandedComments] = useState<{ [key: string]: boolean }>({});

  const handlePrevWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  // Initial data fetch
  useEffect(() => {
    const today = format(new Date(), 'yyyy-MM-dd');
    
    // Set initial state without triggering a fetch
    useDiaryStore.setState({ 
      entries: [],
      selectedDate: today,
      loading: true 
    });
    
    // Single fetch call after state is set
    setTimeout(() => {
      fetchEntries(1).then(() => setIsInitialized(true));
    }, 0);

    return () => {
      useDiaryStore.setState({ 
        entries: [],
        selectedDate: null 
      });
    };
  }, [fetchEntries]);

  const handlePageChange = (_: any, page: number) => {
    fetchEntries(page);
  };

  const handleDateSelect = (date: string | null) => {
    // Set the date in store without triggering fetch
    useDiaryStore.setState({ selectedDate: date });
    // Manually trigger fetch
    fetchEntries(1);
  };

  const handleComment = async (diaryId: string) => {
    const comment = commentContent[diaryId];
    if (!comment?.trim()) return;

    try {
      await addComment(diaryId, comment);
      setCommentContent((prev) => ({ ...prev, [diaryId]: '' }));
    } catch (err) {
      console.error('Error adding comment:', err);
    }
  };

  const handleReaction = async (diaryId: string, type: 'like' | 'heart' | 'celebrate' | 'support') => {
    try {
      await addReaction(diaryId, type);
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

  const getDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      dates.push(format(date, 'yyyy-MM-dd'));
    }
    return dates;
  };

  const getVisibleComments = (entry: DiaryEntry) => {
    if (expandedComments[entry._id]) {
      return entry.comments;
    }
    return entry.comments.slice(-2);
  };

  return (
    <Box sx={{ 
      height: 'calc(100vh - 180px)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      {/* Date picker section - fixed height */}
      <Box sx={{ px: 3, pt: 2, pb: 2, flexShrink: 0 }}>
        <Box sx={{ 
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 1,
          mb: 2 
        }}>
          <IconButton onClick={handlePrevWeek} size="small">
            <ChevronLeft />
          </IconButton>
          <Typography variant="subtitle2" sx={{ minWidth: 120, textAlign: 'center' }}>
            Week of {format(weekStart, 'MMM d')}
          </Typography>
          <IconButton onClick={handleNextWeek} size="small">
            <ChevronRight />
          </IconButton>
        </Box>

        <Stack
          direction="row" 
          spacing={1} 
          sx={{ 
            overflowX: 'auto',
            pb: 1,
            '&::-webkit-scrollbar': {
              height: '4px',
            },
            '&::-webkit-scrollbar-track': {
              backgroundColor: 'background.paper',
            },
            '&::-webkit-scrollbar-thumb': {
              backgroundColor: 'primary.light',
              borderRadius: '2px',
            },
          }}
        >
          <Chip
            label="All Days"
            variant={selectedDate === null ? 'filled' : 'outlined'}
            color="primary"
            onClick={() => handleDateSelect(null)}
            sx={{ 
              minWidth: 90,
              borderRadius: 1,
              fontWeight: selectedDate === null ? 600 : 400,
            }}
          />
          {[...Array(7)].map((_, index) => {
            const date = addDays(weekStart, index);
            const formattedDate = format(date, 'yyyy-MM-dd');
            return (
              <Chip
                key={index}
                label={format(date, 'EEE, MMM d')}
                variant={selectedDate === formattedDate ? 'filled' : 'outlined'}
                color="primary"
                onClick={() => handleDateSelect(formattedDate)}
                sx={{ 
                  minWidth: 120,
                  borderRadius: 1,
                  fontWeight: selectedDate === formattedDate ? 600 : 400,
                  ...(isToday(date) && {
                    borderColor: 'primary.main',
                  }),
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* Main content area - scrollable */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        gap: 2,
        px: 3,
        pb: 3,
        overflow: 'auto',
        minHeight: 0
      }}>
        {/* Left side - Diary entries */}
        <Box sx={{ 
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          minHeight: 0,
          overflow: 'auto'
        }}>
          <Box sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2
          }}>
            {entries.map((entry) => (
              <Card key={entry._id}>
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
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Avatar sx={{ bgcolor: 'primary.main' }}>
                        {entry.userId?.name ? entry.userId.name.charAt(0).toUpperCase() : 'U'}
                      </Avatar>
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                          {entry.userId?.name || 'Unknown User'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center' }}>
                          <CalendarToday sx={{ fontSize: 14, mr: 0.5 }} />
                          {format(new Date(entry.date), 'MMMM d, yyyy')}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>

                  <Typography 
                    variant="body1" 
                    sx={{ 
                      mb: 1.5,
                      whiteSpace: 'pre-wrap',
                      flex: 1,
                      overflow: 'auto'
                    }}
                  >
                    {entry.content}
                  </Typography>

                  <Box sx={{ 
                    borderTop: 1,
                    borderColor: 'divider',
                    pt: 1.5,
                    display: 'flex',
                    flexDirection: 'column',
                    flex: 1,
                    minHeight: 0
                  }}>
                    {entry.comments.length > 0 && (
                      <Box sx={{ 
                        flex: 1,
                        minHeight: 0,
                        mb: 2
                      }}>
                        <Box sx={{
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 1,
                          height: '100%',
                          overflowY: 'auto',
                          pr: 1,
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
                        }}>
                          {getVisibleComments(entry).map((comment, index) => (
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
                                  {comment.userId.name.charAt(0).toUpperCase()}
                                </Avatar>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {comment.userId.name}
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
                        
                        {entry.comments.length > 2 && (
                          <Button
                            size="small"
                            onClick={() => setExpandedComments(prev => ({
                              ...prev,
                              [entry._id]: !prev[entry._id]
                            }))}
                            sx={{ mt: 1 }}
                          >
                            {expandedComments[entry._id] ? 'Show Less' : `Show All (${entry.comments.length})`}
                          </Button>
                        )}
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
                        value={commentContent[entry._id] || ''}
                        onChange={(e) => setCommentContent(prev => ({
                          ...prev,
                          [entry._id]: e.target.value
                        }))}
                        sx={{ 
                          '& .MuiInputBase-root': {
                            fontSize: '0.875rem'
                          }
                        }}
                      />
                      <Button
                        variant="contained"
                        onClick={() => handleComment(entry._id)}
                        disabled={!commentContent[entry._id]?.trim()}
                        size="small"
                      >
                        Comment
                      </Button>
                    </Box>
                  </Box>
                </CardContent>
              </Card>
            ))}
          </Box>
        </Box>

        {/* Right side - Todos */}
        <Box sx={{ 
          flex: 1,
          minWidth: '300px',
          overflow: 'auto'
        }}>
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

              <List sx={{ 
                flex: 1,
                overflowY: 'auto',
                minHeight: 0
              }}>
                {entries.map(entry => (
                  entry.todos?.map((todo, index) => (
                    <ListItem
                      key={`${entry._id}-${index}`}
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
                          disabled
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={todo.content}
                        secondary={entry.userId.name}
                        primaryTypographyProps={{
                          style: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }
                        }}
                      />
                    </ListItem>
                  ))
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
                  {entries.reduce((total, entry) => total + (entry.todos?.filter(t => t.completed).length || 0), 0)} of {entries.reduce((total, entry) => total + (entry.todos?.length || 0), 0)} tasks completed
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {totalPages > 1 && (
        <Box sx={{ mt: 2, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
          />
        </Box>
      )}
    </Box>
  );
};

export default DiaryFeed; 