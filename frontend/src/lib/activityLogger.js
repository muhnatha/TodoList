// lib/activityLogger.js
import { supabase } from './supabaseClient';

class ActivityLogger {
  constructor() {
    this.userId = null;
    this.initializeUser();
  }

  async initializeUser() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        this.userId = user.id;
      }
    } catch (error) {
      console.error('Failed to initialize user for activity logging:', error);
    }
  }

  async getCurrentUser() {
    if (!this.userId) {
      await this.initializeUser();
    }
    return this.userId;
  }

  async log(page, action, details) {
    try {
      const userId = await this.getCurrentUser();
      if (!userId) {
        console.warn('No user found for activity logging');
        return { success: false, error: 'No authenticated user' };
      }

      // Check for recent duplicate activity (within 1 minute)
      const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
      
      const { data: recentLogs } = await supabase
        .from('activity_log')
        .select('id')
        .eq('user_id', userId)
        .eq('page', page)
        .eq('action', action)
        .eq('details', details)
        .gte('created_at', oneMinuteAgo)
        .limit(1);

      // If duplicate found, don't log again
      if (recentLogs && recentLogs.length > 0) {
        return { success: true, message: 'Duplicate activity ignored' };
      }

      const { data, error } = await supabase
        .from('activity_log')
        .insert([{
          user_id: userId,
          page,
          action,
          details,
          created_at: new Date().toISOString()
        }]);

      if (error) {
        console.error('Error logging activity:', error);
        return { success: false, error };
      }

      return { success: true, data };
    } catch (err) {
      console.error('Unexpected error in activity logging:', err);
      return { success: false, error: err };
    }
  }

  // Convenience methods for common activities
  async logPageVisit(pageName) {
    return this.log(pageName, 'Visited', `Accessed ${pageName} page`);
  }

  async logLogin() {
    return this.log('Authentication', 'Login', 'User logged in');
  }

  async logLogout() {
    return this.log('Authentication', 'Logout', 'User logged out');
  }

  async logPasswordChange() {
    return this.log('Profile', 'Updated', 'Changed password');
  }

  async logProfileUpdate(changes) {
    const changesList = Object.keys(changes).join(', ');
    return this.log('Profile', 'Updated', `Updated profile fields: ${changesList}`);
  }

  async logNoteCreated(noteTitle) {
    return this.log('Notes', 'Created', `Created note: "${noteTitle}"`);
  }

  async logNoteUpdated(noteTitle) {
    return this.log('Notes', 'Updated', `Updated note: "${noteTitle}"`);
  }

  async logNoteDeleted(noteTitle) {
    return this.log('Notes', 'Deleted', `Deleted note: "${noteTitle}"`);
  }

  async logCalendarEvent(eventTitle, action = 'Created') {
    return this.log('Calendar', action, `${action} event: "${eventTitle}"`);
  }

  async logBillCreated(billTitle) {
    return this.log('Bills', 'Created', `Created bill: "${billTitle}"`);
  }

  async logBillUpdated(billTitle) {
    return this.log('Bills', 'Updated', `Updated bill: "${billTitle}"`);
  }

  async logBillDeleted(billTitle) {
    return this.log('Bills', 'Deleted', `Deleted bill: "${billTitle}"`);
  }
}

// Create a singleton instance
const activityLogger = new ActivityLogger();

export default activityLogger;