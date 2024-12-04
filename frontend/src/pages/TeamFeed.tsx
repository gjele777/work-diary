import React, { useEffect, useRef, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  CircularProgress,
  Alert,
  Avatar,
  IconButton,
  Stack,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Checkbox,
  Divider,
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
import { format, startOfWeek, addDays, isToday, isSameDay } from 'date-fns';
import { useDiaryStore } from '../stores/diaryStore';
import { useAuthStore } from '../stores/authStore';

const TeamFeed = () => {
  const {
    entries,
    loading,
    error,
    fetchEntries,
    addComment,
    addReaction,
    selectedDate,
    setSelectedDate,
  } = useDiaryStore();
  const user = useAuthStore((state) => state.user);
  const [commentContent, setCommentContent] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [localError, setLocalError] = useState<string | null>(null);
  const commentsRef = useRef<HTMLDivElement>(null);

  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date(), { weekStartsOn: 1 }));

  const handlePrevWeek = () => {
    setWeekStart(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setWeekStart(prev => addDays(prev, 7));
  };

  useEffect(() => {
    fetchEntries(1);
  }, [fetchEntries]);

  const handleComment = async (diaryId: string) => {
    if (!commentContent.trim() || !user) return;

    try {
      await addComment(diaryId, commentContent);
      setCommentContent('');
      setSuccessMessage('Comment added successfully!');
      setTimeout(() => setSuccessMessage(''), 3000);
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

  const handleDateSelect = (date: string | null) => {
    setSelectedDate(date);
  };

  const getDates = () => {
    const dates = [];
    for (let i = 0; i < 7; i++) {
      const date = addDays(weekStart, i);
      dates.push(date);
    }
    return dates;
  };

  if (loading && !entries.length) {
    return <CircularProgress />;
  }

  return (
    <Box sx={{ 
      height: 'calc(100vh - 180px)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Date Picker - Fixed */}
      <Box sx={{ 
        backgroundColor: 'background.paper',
        borderBottom: 1,
        borderColor: 'divider',
        px: 3,
        py: 2,
        flexShrink: 0
      }}>
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          mb: 2 
        }}>
          <Typography variant="h6" color="primary">
            Team Feed
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
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
          {getDates().map((date) => {
            const formattedDate = format(date, 'yyyy-MM-dd');
            const isSelected = selectedDate === formattedDate;
            const isCurrentDay = isToday(date);
            
            return (
              <Chip
                key={formattedDate}
                label={
                  <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', py: 0.5 }}>
                    <Typography variant="caption" sx={{ opacity: 0.8 }}>
                      {format(date, 'EEE')}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: isSelected || isCurrentDay ? 600 : 400 }}>
                      {format(date, 'd')}
                    </Typography>
                  </Box>
                }
                variant={isSelected ? 'filled' : 'outlined'}
                color={isCurrentDay ? 'primary' : 'default'}
                onClick={() => handleDateSelect(formattedDate)}
                sx={{ 
                  minWidth: 70,
                  height: 'auto',
                  borderRadius: 1,
                  borderColor: isCurrentDay ? 'primary.main' : undefined,
                  backgroundColor: isSelected ? 'primary.main' : isCurrentDay ? 'primary.light' : undefined,
                  '&:hover': {
                    backgroundColor: isSelected ? 'primary.dark' : isCurrentDay ? 'primary.light' : undefined,
                  }
                }}
              />
            );
          })}
        </Stack>
      </Box>

      {/* Success/Error messages - Fixed */}
      {successMessage && (
        <Alert severity="success" sx={{ mx: 3, flexShrink: 0 }}>
          {successMessage}
        </Alert>
      )}
      {localError && (
        <Alert severity="error" sx={{ mx: 3, flexShrink: 0 }}>
          {localError}
        </Alert>
      )}

      {/* Main Content Area - Scrollable */}
      <Box sx={{ 
        flex: 1,
        display: 'flex',
        gap: 2,
        px: 3,
        pb: 3,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          width: '8px',
        },
        '&::-webkit-scrollbar-track': {
          backgroundColor: 'background.paper',
        },
        '&::-webkit-scrollbar-thumb': {
          backgroundColor: 'grey.300',
          borderRadius: '4px',
        },
      }}>
        {/* Diary Entries Column */}
        <Box sx={{ 
          flex: 2,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}>
          {entries.length === 0 ? (
            <Alert severity="info">No entries found for the selected date.</Alert>
          ) : (
            entries.map((entry) => (
              <Card key={entry._id}>
                <CardContent>
                  {/* User Info */}
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1,
                    mb: 2
                  }}>
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {entry.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                    </Avatar>
                    <Box>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {entry.userId?.name || 'Anonymous'}
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <CalendarToday sx={{ fontSize: 14 }} />
                        {format(new Date(entry.date), 'MMM d, h:mm a')}
                      </Typography>
                    </Box>
                  </Box>

                  {/* Diary Content */}
                  <Typography
                    variant="body1"
                    sx={{
                      mb: 2,
                      whiteSpace: 'pre-wrap',
                    }}
                  >
                    {entry.content}
                  </Typography>

                  {/* Reactions */}
                  <Box sx={{ 
                    display: 'flex',
                    gap: 1,
                    mb: 2
                  }}>
                    <IconButton
                      size="small"
                      onClick={() => handleReaction(entry._id, 'like')}
                      color={entry.reactions.some(r => r.userId === user?.id && r.type === 'like') ? 'primary' : 'default'}
                    >
                      <ThumbUp fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {entry.reactions.filter(r => r.type === 'like').length || 0}
                      </Typography>
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleReaction(entry._id, 'heart')}
                      color={entry.reactions.some(r => r.userId === user?.id && r.type === 'heart') ? 'primary' : 'default'}
                    >
                      <Favorite fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {entry.reactions.filter(r => r.type === 'heart').length || 0}
                      </Typography>
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleReaction(entry._id, 'celebrate')}
                      color={entry.reactions.some(r => r.userId === user?.id && r.type === 'celebrate') ? 'primary' : 'default'}
                    >
                      <Celebration fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {entry.reactions.filter(r => r.type === 'celebrate').length || 0}
                      </Typography>
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleReaction(entry._id, 'support')}
                      color={entry.reactions.some(r => r.userId === user?.id && r.type === 'support') ? 'primary' : 'default'}
                    >
                      <EmojiEmotions fontSize="small" />
                      <Typography variant="caption" sx={{ ml: 0.5 }}>
                        {entry.reactions.filter(r => r.type === 'support').length || 0}
                      </Typography>
                    </IconButton>
                  </Box>

                  {/* Comments Section */}
                  {entry.comments.length > 0 && (
                    <Box sx={{ mb: 2 }}>
                      {entry.comments.map((comment, index) => (
                        <Box 
                          key={index}
                          sx={{ 
                            p: 1,
                            backgroundColor: 'background.default',
                            borderRadius: 1,
                            mb: 1,
                            '&:hover': {
                              backgroundColor: 'action.hover'
                            }
                          }}
                        >
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Avatar sx={{ width: 24, height: 24, bgcolor: 'primary.main' }}>
                              {comment.userId?.name?.charAt(0)?.toUpperCase() || '?'}
                            </Avatar>
                            <Box sx={{ flex: 1 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                  {comment.userId?.name || 'Anonymous'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {format(new Date(comment.createdAt), 'MMM d, h:mm a')}
                                </Typography>
                              </Box>
                              <Typography variant="body2">
                                {comment.content}
                              </Typography>
                            </Box>
                          </Box>
                        </Box>
                      ))}
                    </Box>
                  )}

                  {/* Comment Input */}
                  <Box sx={{ 
                    display: 'flex', 
                    gap: 1,
                    mt: 2
                  }}>
                    <TextField
                      size="small"
                      fullWidth
                      placeholder="Add a comment..."
                      value={commentContent}
                      onChange={(e) => setCommentContent(e.target.value)}
                    />
                    <Button
                      variant="contained"
                      onClick={() => handleComment(entry._id)}
                      disabled={!commentContent.trim()}
                      size="small"
                    >
                      Comment
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            ))
          )}
        </Box>

        {/* Todos Section - Fixed */}
        {entries[0] && (
          <Box sx={{ 
            flex: 1,
            minWidth: '300px',
            alignSelf: 'flex-start',
            position: 'sticky',
            top: 0
          }}>
            <Card>
              <CardContent>
                <Box sx={{ 
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  mb: 2
                }}>
                  <Typography variant="h6">
                    {format(new Date(entries[0].date), "MMM d")} Tasks
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {entries[0].todos?.filter((t: any) => t.completed).length || 0} of {entries[0].todos?.length || 0} completed
                  </Typography>
                </Box>

                <List sx={{ 
                  '& .MuiListItem-root': {
                    px: 1,
                    py: 0.5,
                  }
                }}>
                  {entries[0].todos?.map((todo: any, index: number) => (
                    <ListItem
                      key={index}
                      sx={{
                        textDecoration: todo.completed ? 'line-through' : 'none',
                        opacity: todo.completed ? 0.7 : 1,
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        <Checkbox
                          edge="start"
                          checked={todo.completed}
                          disabled
                          size="small"
                        />
                      </ListItemIcon>
                      <ListItemText 
                        primary={todo.content}
                        primaryTypographyProps={{
                          variant: 'body2',
                          style: {
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                          }
                        }}
                      />
                    </ListItem>
                  ))}
                  {(!entries[0].todos || entries[0].todos.length === 0) && (
                    <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>
                      No tasks for this day
                    </Typography>
                  )}
                </List>
              </CardContent>
            </Card>
          </Box>
        )}
      </Box>
    </Box>
  );
};

export default TeamFeed; 