export function formatEmailDate(date: string | null): string {
  if (!date) return '';
  
  const messageDate = new Date(date);
  const now = new Date();
  const isToday = messageDate.toDateString() === now.toDateString();

  if (isToday) {
    return messageDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  return messageDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric'
  });
}

// For thread view we want more details
export function formatThreadDate(date: string | null): string {
  if (!date) return '';
  
  const messageDate = new Date(date);
  const now = new Date();
  const isToday = messageDate.toDateString() === now.toDateString();

  if (isToday) {
    return messageDate.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // If it's this year, show Month Day, Time
  if (messageDate.getFullYear() === now.getFullYear()) {
    return messageDate.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  }

  // If it's older, show Month Day, Year
  return messageDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}
