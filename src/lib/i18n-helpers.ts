/**
 * i18n Helper Utility
 * 
 * This file provides helper functions to make it easier to implement
 * translations across your application
 */

import { useTranslations } from 'next-intl'
import { getTranslations } from 'next-intl/server'

/**
 * Client-side hook for translations
 * Use this in 'use client' components
 */
export function useI18n() {
  const t = useTranslations()
  
  return {
    t,
    // Auth translations
    auth: {
      login: {
        title: t('auth_login_title'),
        subtitle: t('auth_login_subtitle'),
        emailLabel: t('auth_login_email_label'),
        emailPlaceholder: t('auth_login_email_placeholder'),
        passwordLabel: t('auth_login_password_label'),
        passwordPlaceholder: t('auth_login_password_placeholder'),
        button: t('auth_login_button'),
        googleButton: t('auth_login_google'),
        noAccount: t('auth_login_no_account'),
        signupLink: t('auth_login_signup_link'),
      },
      register: {
        title: t('auth_register_title'),
        subtitle: t('auth_register_subtitle'),
        nameLabel: t('auth_register_name_label'),
        namePlaceholder: t('auth_register_name_placeholder'),
        emailLabel: t('auth_register_email_label'),
        emailPlaceholder: t('auth_register_email_placeholder'),
        passwordLabel: t('auth_register_password_label'),
        passwordPlaceholder: t('auth_register_password_placeholder'),
        button: t('auth_register_button'),
        googleButton: t('auth_register_google'),
        haveAccount: t('auth_register_have_account'),
        signinLink: t('auth_register_signin_link'),
      },
    },
    // Navigation translations
    nav: {
      dashboard: t('nav_dashboard'),
      items: t('nav_items'),
      reservations: t('nav_reservations'),
      profile: t('nav_profile'),
      logout: t('nav_logout'),
      admin: t('nav_admin'),
      analytics: t('nav_analytics'),
      lateTracking: t('nav_late_tracking'),
      myItems: t('nav_my_items'),
      notifications: t('nav_my_notifications'),
      returns: t('nav_returns'),
    },
    // Common buttons
    buttons: {
      save: t('button_save'),
      cancel: t('button_cancel'),
      delete: t('button_delete'),
      edit: t('button_edit'),
      create: t('button_create'),
      update: t('button_update'),
      submit: t('button_submit'),
      close: t('button_close'),
      back: t('button_back'),
      next: t('button_next'),
      previous: t('button_previous'),
      confirm: t('button_confirm'),
      search: t('button_search'),
      filter: t('button_filter'),
      clear: t('button_clear'),
      apply: t('button_apply'),
      reset: t('button_reset'),
    },
    // Common messages
    common: {
      loading: t('common_loading'),
      saving: t('common_saving'),
      deleting: t('common_deleting'),
      error: t('common_error'),
      success: t('common_success'),
      warning: t('common_warning'),
      info: t('common_info'),
      confirmDelete: t('common_confirm_delete'),
      confirmCancel: t('common_confirm_cancel'),
      noData: t('common_no_data'),
      tryAgain: t('common_try_again'),
      goBack: t('common_go_back'),
    },
    // Item status translations
    itemStatus: {
      available: t('item_status_available'),
      borrowed: t('item_status_borrowed'),
      maintenance: t('item_status_maintenance'),
      reserved: t('item_status_reserved'),
      retired: t('item_status_retired'),
    },
    // Item condition translations
    itemCondition: {
      excellent: t('item_condition_excellent'),
      good: t('item_condition_good'),
      fair: t('item_condition_fair'),
      poor: t('item_condition_poor'),
      damaged: t('item_condition_damaged'),
    },
    // Reservation status translations
    reservationStatus: {
      pending: t('reservation_status_pending'),
      approved: t('reservation_status_approved'),
      rejected: t('reservation_status_rejected'),
      active: t('reservation_status_active'),
      completed: t('reservation_status_completed'),
      cancelled: t('reservation_status_cancelled'),
      overdue: t('reservation_status_overdue'),
    },
  }
}

/**
 * Server-side function for translations
 * Use this in server components
 */
export async function getI18n() {
  const t = await getTranslations()
  
  return {
    t,
    auth: {
      login: {
        title: t('auth_login_title'),
        subtitle: t('auth_login_subtitle'),
        emailLabel: t('auth_login_email_label'),
        emailPlaceholder: t('auth_login_email_placeholder'),
        passwordLabel: t('auth_login_password_label'),
        passwordPlaceholder: t('auth_login_password_placeholder'),
        button: t('auth_login_button'),
        googleButton: t('auth_login_google'),
        noAccount: t('auth_login_no_account'),
        signupLink: t('auth_login_signup_link'),
      },
    },
    nav: {
      dashboard: t('nav_dashboard'),
      items: t('nav_items'),
      reservations: t('nav_reservations'),
      profile: t('nav_profile'),
    },
    buttons: {
      save: t('button_save'),
      cancel: t('button_cancel'),
      delete: t('button_delete'),
      edit: t('button_edit'),
    },
    common: {
      loading: t('common_loading'),
      error: t('common_error'),
      success: t('common_success'),
    },
  }
}

/**
 * Translate item status dynamically
 */
export function translateItemStatus(status: string, t: ReturnType<typeof useTranslations>) {
  const statusMap: Record<string, string> = {
    AVAILABLE: t('item_status_available'),
    BORROWED: t('item_status_borrowed'),
    MAINTENANCE: t('item_status_maintenance'),
    RESERVED: t('item_status_reserved'),
    RETIRED: t('item_status_retired'),
  }
  return statusMap[status] || status
}

/**
 * Translate item condition dynamically
 */
export function translateItemCondition(condition: string, t: ReturnType<typeof useTranslations>) {
  const conditionMap: Record<string, string> = {
    EXCELLENT: t('item_condition_excellent'),
    GOOD: t('item_condition_good'),
    FAIR: t('item_condition_fair'),
    POOR: t('item_condition_poor'),
    DAMAGED: t('item_condition_damaged'),
  }
  return conditionMap[condition] || condition
}

/**
 * Translate reservation status dynamically
 */
export function translateReservationStatus(status: string, t: ReturnType<typeof useTranslations>) {
  const statusMap: Record<string, string> = {
    PENDING: t('reservation_status_pending'),
    APPROVED: t('reservation_status_approved'),
    REJECTED: t('reservation_status_rejected'),
    ACTIVE: t('reservation_status_active'),
    COMPLETED: t('reservation_status_completed'),
    CANCELLED: t('reservation_status_cancelled'),
    OVERDUE: t('reservation_status_overdue'),
  }
  return statusMap[status] || status
}
