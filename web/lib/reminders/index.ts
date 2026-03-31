/**
 * Reminders Module
 *
 * Handles reminder processing, content building, and channel sending.
 */

export { buildReminderContent } from './content-builder'
export { sendReminderToChannels } from './channel-sender'
export type {
  Reminder,
  ClientInfo,
  PetInfo,
  MessageTemplate,
  ChannelResult,
  ReminderContent,
} from './types'
