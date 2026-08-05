export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      admissions: {
        Row: {
          admission_date: string | null
          admitting_doctor_id: string | null
          bed_id: string | null
          created_at: string | null
          discharge_date: string | null
          id: string
          patient_id: string | null
          primary_diagnosis: string | null
          reason: string | null
          status: string | null
        }
        Insert: {
          admission_date?: string | null
          admitting_doctor_id?: string | null
          bed_id?: string | null
          created_at?: string | null
          discharge_date?: string | null
          id?: string
          patient_id?: string | null
          primary_diagnosis?: string | null
          reason?: string | null
          status?: string | null
        }
        Update: {
          admission_date?: string | null
          admitting_doctor_id?: string | null
          bed_id?: string | null
          created_at?: string | null
          discharge_date?: string | null
          id?: string
          patient_id?: string | null
          primary_diagnosis?: string | null
          reason?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admissions_admitting_doctor_id_fkey"
            columns: ["admitting_doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_bed_id_fkey"
            columns: ["bed_id"]
            isOneToOne: false
            referencedRelation: "beds"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admissions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      ai_settings: {
        Row: {
          available_models: string[] | null
          default_model: string | null
          id: string
          updated_at: string | null
        }
        Insert: {
          available_models?: string[] | null
          default_model?: string | null
          id?: string
          updated_at?: string | null
        }
        Update: {
          available_models?: string[] | null
          default_model?: string | null
          id?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      appointments: {
        Row: {
          appointment_date: string
          created_at: string | null
          id: string
          patient_id: string | null
          provider_id: string | null
          reason: string | null
          status: string
          updated_at: string
        }
        Insert: {
          appointment_date: string
          created_at?: string | null
          id?: string
          patient_id?: string | null
          provider_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          appointment_date?: string
          created_at?: string | null
          id?: string
          patient_id?: string | null
          provider_id?: string | null
          reason?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "appointments_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "appointments_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      beds: {
        Row: {
          bed_number: string
          created_at: string | null
          id: string
          status: string | null
          ward_id: string | null
        }
        Insert: {
          bed_number: string
          created_at?: string | null
          id?: string
          status?: string | null
          ward_id?: string | null
        }
        Update: {
          bed_number?: string
          created_at?: string | null
          id?: string
          status?: string | null
          ward_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "beds_ward_id_fkey"
            columns: ["ward_id"]
            isOneToOne: false
            referencedRelation: "wards"
            referencedColumns: ["id"]
          },
        ]
      }
      blood_donations: {
        Row: {
          blood_group: string
          created_at: string | null
          donation_date: string | null
          donor_contact: string | null
          donor_name: string
          id: string
          quantity_ml: number
          result: string | null
          screened: boolean | null
        }
        Insert: {
          blood_group: string
          created_at?: string | null
          donation_date?: string | null
          donor_contact?: string | null
          donor_name: string
          id?: string
          quantity_ml: number
          result?: string | null
          screened?: boolean | null
        }
        Update: {
          blood_group?: string
          created_at?: string | null
          donation_date?: string | null
          donor_contact?: string | null
          donor_name?: string
          id?: string
          quantity_ml?: number
          result?: string | null
          screened?: boolean | null
        }
        Relationships: []
      }
      blood_inventory: {
        Row: {
          blood_group: string
          component_type: string
          created_at: string | null
          expiry_date: string
          id: string
          quantity_units: number | null
          status: string | null
        }
        Insert: {
          blood_group: string
          component_type: string
          created_at?: string | null
          expiry_date: string
          id?: string
          quantity_units?: number | null
          status?: string | null
        }
        Update: {
          blood_group?: string
          component_type?: string
          created_at?: string | null
          expiry_date?: string
          id?: string
          quantity_units?: number | null
          status?: string | null
        }
        Relationships: []
      }
      blood_transfusions: {
        Row: {
          blood_group_required: string
          component_required: string
          created_at: string | null
          crossmatch_result: string | null
          doctor_id: string | null
          id: string
          patient_id: string | null
          quantity_units: number
          status: string | null
          transfused_at: string | null
          urgency: string | null
        }
        Insert: {
          blood_group_required: string
          component_required: string
          created_at?: string | null
          crossmatch_result?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          quantity_units: number
          status?: string | null
          transfused_at?: string | null
          urgency?: string | null
        }
        Update: {
          blood_group_required?: string
          component_required?: string
          created_at?: string | null
          crossmatch_result?: string | null
          doctor_id?: string | null
          id?: string
          patient_id?: string | null
          quantity_units?: number
          status?: string | null
          transfused_at?: string | null
          urgency?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "blood_transfusions_doctor_id_fkey"
            columns: ["doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "blood_transfusions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      clinic_assets: {
        Row: {
          category: string
          condition: string | null
          created_at: string
          id: string
          last_maintenance: string | null
          location: string | null
          model_number: string | null
          name: string
          next_maintenance: string | null
          notes: string | null
          purchase_cost: number | null
          purchase_date: string | null
          serial_number: string | null
          status: string | null
        }
        Insert: {
          category: string
          condition?: string | null
          created_at?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          model_number?: string | null
          name: string
          next_maintenance?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
        }
        Update: {
          category?: string
          condition?: string | null
          created_at?: string
          id?: string
          last_maintenance?: string | null
          location?: string | null
          model_number?: string | null
          name?: string
          next_maintenance?: string | null
          notes?: string | null
          purchase_cost?: number | null
          purchase_date?: string | null
          serial_number?: string | null
          status?: string | null
        }
        Relationships: []
      }
      clinic_documents: {
        Row: {
          created_at: string
          document_type: string
          expiry_date: string | null
          file_url: string | null
          id: string
          issue_date: string | null
          issuer: string | null
          notes: string | null
          status: string | null
          title: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          document_type: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          notes?: string | null
          status?: string | null
          title: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          document_type?: string
          expiry_date?: string | null
          file_url?: string | null
          id?: string
          issue_date?: string | null
          issuer?: string | null
          notes?: string | null
          status?: string | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      clinical_notes: {
        Row: {
          assessment: string | null
          created_at: string | null
          id: string
          objective: string | null
          patient_id: string | null
          plan: string | null
          provider_id: string | null
          subjective: string | null
          updated_at: string | null
        }
        Insert: {
          assessment?: string | null
          created_at?: string | null
          id?: string
          objective?: string | null
          patient_id?: string | null
          plan?: string | null
          provider_id?: string | null
          subjective?: string | null
          updated_at?: string | null
        }
        Update: {
          assessment?: string | null
          created_at?: string | null
          id?: string
          objective?: string | null
          patient_id?: string | null
          plan?: string | null
          provider_id?: string | null
          subjective?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clinical_notes_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "clinical_notes_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name: string
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string
        }
        Relationships: []
      }
      diagnosis: {
        Row: {
          created_at: string | null
          description: string | null
          icd10_code: string
          id: string
          is_primary: boolean | null
          note_id: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icd10_code: string
          id?: string
          is_primary?: boolean | null
          note_id?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icd10_code?: string
          id?: string
          is_primary?: boolean | null
          note_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "diagnosis_note_id_fkey"
            columns: ["note_id"]
            isOneToOne: false
            referencedRelation: "clinical_notes"
            referencedColumns: ["id"]
          },
        ]
      }
      er_visits: {
        Row: {
          arrival_mode: string | null
          assigned_doctor_id: string | null
          chief_complaint: string
          created_at: string | null
          disposition: string | null
          id: string
          patient_id: string | null
          status: string | null
          triage_level: string
          vitals_snapshot: Json | null
        }
        Insert: {
          arrival_mode?: string | null
          assigned_doctor_id?: string | null
          chief_complaint: string
          created_at?: string | null
          disposition?: string | null
          id?: string
          patient_id?: string | null
          status?: string | null
          triage_level: string
          vitals_snapshot?: Json | null
        }
        Update: {
          arrival_mode?: string | null
          assigned_doctor_id?: string | null
          chief_complaint?: string
          created_at?: string | null
          disposition?: string | null
          id?: string
          patient_id?: string | null
          status?: string | null
          triage_level?: string
          vitals_snapshot?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "er_visits_assigned_doctor_id_fkey"
            columns: ["assigned_doctor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "er_visits_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      email_deliveries: {
        Row: {
          created_at: string
          delivered_at: string | null
          id: string
          idempotency_key: string
          job_id: string | null
          last_error: string | null
          metadata: Json
          notification_type: string
          period_key: string | null
          provider_message_id: string | null
          recipient_email: string
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          idempotency_key: string
          job_id?: string | null
          last_error?: string | null
          metadata?: Json
          notification_type: string
          period_key?: string | null
          provider_message_id?: string | null
          recipient_email: string
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivered_at?: string | null
          id?: string
          idempotency_key?: string
          job_id?: string | null
          last_error?: string | null
          metadata?: Json
          notification_type?: string
          period_key?: string | null
          provider_message_id?: string | null
          recipient_email?: string
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_deliveries_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "email_notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      email_notification_jobs: {
        Row: {
          attempt_count: number
          created_at: string
          entity_id: string
          entity_type: string
          id: string
          last_error: string | null
          locked_at: string | null
          max_attempts: number
          notification_type: string
          payload: Json
          processed_at: string | null
          scheduled_for: string
          status: string
          updated_at: string
        }
        Insert: {
          attempt_count?: number
          created_at?: string
          entity_id: string
          entity_type: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          notification_type: string
          payload?: Json
          processed_at?: string | null
          scheduled_for: string
          status?: string
          updated_at?: string
        }
        Update: {
          attempt_count?: number
          created_at?: string
          entity_id?: string
          entity_type?: string
          id?: string
          last_error?: string | null
          locked_at?: string | null
          max_attempts?: number
          notification_type?: string
          payload?: Json
          processed_at?: string | null
          scheduled_for?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      email_notification_settings: {
        Row: {
          appointment_confirmation_enabled: boolean
          appointment_reminder_24h_enabled: boolean
          appointment_reminder_2h_enabled: boolean
          clinical_digest_time: string
          created_at: string
          critical_stock_alerts_enabled: boolean
          daily_report_enabled: boolean
          daily_report_time: string
          enabled: boolean
          id: string
          inventory_digest_enabled: boolean
          inventory_digest_time: string
          laboratory_digest_enabled: boolean
          manager_report_email: string | null
          monthly_report_day: number
          monthly_report_enabled: boolean
          monthly_report_time: string
          provider_schedule_enabled: boolean
          provider_schedule_time: string
          radiology_digest_enabled: boolean
          report_cc_emails: string[]
          singleton_key: boolean
          timezone: string
          updated_at: string
          updated_by: string | null
          weekly_report_day: number
          weekly_report_enabled: boolean
          weekly_report_time: string
        }
        Insert: {
          appointment_confirmation_enabled?: boolean
          appointment_reminder_24h_enabled?: boolean
          appointment_reminder_2h_enabled?: boolean
          clinical_digest_time?: string
          created_at?: string
          critical_stock_alerts_enabled?: boolean
          daily_report_enabled?: boolean
          daily_report_time?: string
          enabled?: boolean
          id?: string
          inventory_digest_enabled?: boolean
          inventory_digest_time?: string
          laboratory_digest_enabled?: boolean
          manager_report_email?: string | null
          monthly_report_day?: number
          monthly_report_enabled?: boolean
          monthly_report_time?: string
          provider_schedule_enabled?: boolean
          provider_schedule_time?: string
          radiology_digest_enabled?: boolean
          report_cc_emails?: string[]
          singleton_key?: boolean
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          weekly_report_day?: number
          weekly_report_enabled?: boolean
          weekly_report_time?: string
        }
        Update: {
          appointment_confirmation_enabled?: boolean
          appointment_reminder_24h_enabled?: boolean
          appointment_reminder_2h_enabled?: boolean
          clinical_digest_time?: string
          created_at?: string
          critical_stock_alerts_enabled?: boolean
          daily_report_enabled?: boolean
          daily_report_time?: string
          enabled?: boolean
          id?: string
          inventory_digest_enabled?: boolean
          inventory_digest_time?: string
          laboratory_digest_enabled?: boolean
          manager_report_email?: string | null
          monthly_report_day?: number
          monthly_report_enabled?: boolean
          monthly_report_time?: string
          provider_schedule_enabled?: boolean
          provider_schedule_time?: string
          radiology_digest_enabled?: boolean
          report_cc_emails?: string[]
          singleton_key?: boolean
          timezone?: string
          updated_at?: string
          updated_by?: string | null
          weekly_report_day?: number
          weekly_report_enabled?: boolean
          weekly_report_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "email_notification_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      email_webhook_events: {
        Row: {
          event_created_at: string | null
          event_id: string
          event_type: string
          provider_message_id: string
          received_at: string
        }
        Insert: {
          event_created_at?: string | null
          event_id: string
          event_type: string
          provider_message_id: string
          received_at?: string
        }
        Update: {
          event_created_at?: string | null
          event_id?: string
          event_type?: string
          provider_message_id?: string
          received_at?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category: string
          created_at: string
          created_by: string | null
          expense_date: string | null
          id: string
          notes: string | null
          payment_method: string | null
          reference_number: string | null
          title: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          created_by?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          title: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          created_by?: string | null
          expense_date?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          reference_number?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      goods_received_notes: {
        Row: {
          created_at: string | null
          grn_number: string | null
          id: string
          po_id: string | null
          received_by: string | null
          received_date: string | null
          remarks: string | null
        }
        Insert: {
          created_at?: string | null
          grn_number?: string | null
          id?: string
          po_id?: string | null
          received_by?: string | null
          received_date?: string | null
          remarks?: string | null
        }
        Update: {
          created_at?: string | null
          grn_number?: string | null
          id?: string
          po_id?: string | null
          received_by?: string | null
          received_date?: string | null
          remarks?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "goods_received_notes_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "goods_received_notes_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_claims: {
        Row: {
          amount_approved: number | null
          amount_claimed: number
          claim_number: string | null
          created_at: string | null
          id: string
          invoice_id: string | null
          processed_at: string | null
          provider_id: string | null
          rejection_reason: string | null
          status: string | null
          submitted_at: string | null
        }
        Insert: {
          amount_approved?: number | null
          amount_claimed: number
          claim_number?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          processed_at?: string | null
          provider_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Update: {
          amount_approved?: number | null
          amount_claimed?: number
          claim_number?: string | null
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          processed_at?: string | null
          provider_id?: string | null
          rejection_reason?: string | null
          status?: string | null
          submitted_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "insurance_claims_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "insurance_claims_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "insurance_providers"
            referencedColumns: ["id"]
          },
        ]
      }
      insurance_providers: {
        Row: {
          code: string | null
          contact_details: Json | null
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          code?: string | null
          contact_details?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          code?: string | null
          contact_details?: Json | null
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: []
      }
      inventory_items: {
        Row: {
          category: string
          created_at: string | null
          id: string
          name: string
          reorder_level: number | null
          stock_level: number | null
          unit: string
          unit_price: number
          updated_at: string | null
        }
        Insert: {
          category: string
          created_at?: string | null
          id?: string
          name: string
          reorder_level?: number | null
          stock_level?: number | null
          unit: string
          unit_price?: number
          updated_at?: string | null
        }
        Update: {
          category?: string
          created_at?: string | null
          id?: string
          name?: string
          reorder_level?: number | null
          stock_level?: number | null
          unit?: string
          unit_price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      inventory_movements: {
        Row: {
          created_at: string
          created_by: string | null
          id: string
          item_id: string | null
          quantity: number
          reason: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          quantity: number
          reason?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          id?: string
          item_id?: string | null
          quantity?: number
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
        ]
      }
      invoice_items: {
        Row: {
          created_at: string | null
          description: string
          id: string
          invoice_id: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          description: string
          id?: string
          invoice_id?: string | null
          quantity: number
          total_price: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          description?: string
          id?: string
          invoice_id?: string | null
          quantity?: number
          total_price?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoice_items_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
        ]
      }
      invoices: {
        Row: {
          created_at: string | null
          id: string
          insurance_claim_id: string | null
          insurance_provider_id: string | null
          paid_amount: number | null
          patient_id: string | null
          status: string
          total_amount: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          insurance_claim_id?: string | null
          insurance_provider_id?: string | null
          paid_amount?: number | null
          patient_id?: string | null
          status?: string
          total_amount: number
        }
        Update: {
          created_at?: string | null
          id?: string
          insurance_claim_id?: string | null
          insurance_provider_id?: string | null
          paid_amount?: number | null
          patient_id?: string | null
          status?: string
          total_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "invoices_insurance_claim_id_fkey"
            columns: ["insurance_claim_id"]
            isOneToOne: false
            referencedRelation: "insurance_claims"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_insurance_provider_id_fkey"
            columns: ["insurance_provider_id"]
            isOneToOne: false
            referencedRelation: "insurance_providers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invoices_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_orders: {
        Row: {
          created_at: string | null
          id: string
          patient_id: string | null
          priority: string
          provider_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          priority?: string
          provider_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          priority?: string
          provider_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "lab_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lab_results: {
        Row: {
          created_at: string | null
          id: string
          order_id: string | null
          reference_range: string | null
          result_value: string | null
          status: string
          test_name: string
          unit: string | null
          validated_by: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          reference_range?: string | null
          result_value?: string | null
          status?: string
          test_name: string
          unit?: string | null
          validated_by?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          order_id?: string | null
          reference_range?: string | null
          result_value?: string | null
          status?: string
          test_name?: string
          unit?: string | null
          validated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "lab_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "lab_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lab_results_validated_by_fkey"
            columns: ["validated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      leave_requests: {
        Row: {
          created_at: string | null
          end_date: string
          id: string
          leave_type: string
          reason: string | null
          staff_id: string | null
          start_date: string
          status: string
        }
        Insert: {
          created_at?: string | null
          end_date: string
          id?: string
          leave_type: string
          reason?: string | null
          staff_id?: string | null
          start_date: string
          status?: string
        }
        Update: {
          created_at?: string | null
          end_date?: string
          id?: string
          leave_type?: string
          reason?: string | null
          staff_id?: string | null
          start_date?: string
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "leave_requests_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      nurse_treatment_sheets: {
        Row: {
          admission_id: string | null
          created_at: string | null
          fluid_intake: number | null
          fluid_output: number | null
          id: string
          medication_administered: string | null
          nurse_id: string | null
          observations: string | null
          vitals_captured: Json | null
        }
        Insert: {
          admission_id?: string | null
          created_at?: string | null
          fluid_intake?: number | null
          fluid_output?: number | null
          id?: string
          medication_administered?: string | null
          nurse_id?: string | null
          observations?: string | null
          vitals_captured?: Json | null
        }
        Update: {
          admission_id?: string | null
          created_at?: string | null
          fluid_intake?: number | null
          fluid_output?: number | null
          id?: string
          medication_administered?: string | null
          nurse_id?: string | null
          observations?: string | null
          vitals_captured?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "nurse_treatment_sheets_admission_id_fkey"
            columns: ["admission_id"]
            isOneToOne: false
            referencedRelation: "admissions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "nurse_treatment_sheets_nurse_id_fkey"
            columns: ["nurse_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      patients: {
        Row: {
          address: string | null
          auth_user_id: string | null
          created_at: string | null
          dob: string
          email: string | null
          emergency_contact_name: string | null
          emergency_contact_phone: string | null
          file_number: string
          first_name: string
          gender: string
          id: string
          insurance_policy_number: string | null
          insurance_provider: string | null
          last_name: string
          phone: string | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          dob: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          file_number: string
          first_name: string
          gender: string
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name: string
          phone?: string | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          auth_user_id?: string | null
          created_at?: string | null
          dob?: string
          email?: string | null
          emergency_contact_name?: string | null
          emergency_contact_phone?: string | null
          file_number?: string
          first_name?: string
          gender?: string
          id?: string
          insurance_policy_number?: string | null
          insurance_provider?: string | null
          last_name?: string
          phone?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          invoice_id: string | null
          payment_method: string
          recorded_by: string | null
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_method: string
          recorded_by?: string | null
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          invoice_id?: string | null
          payment_method?: string
          recorded_by?: string | null
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_invoice_id_fkey"
            columns: ["invoice_id"]
            isOneToOne: false
            referencedRelation: "invoices"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_configs: {
        Row: {
          basic_salary: number | null
          created_at: string | null
          housing_allowance: number | null
          id: string
          medical_allowance: number | null
          pension_id: string | null
          profile_id: string | null
          tax_id: string | null
          transport_allowance: number | null
        }
        Insert: {
          basic_salary?: number | null
          created_at?: string | null
          housing_allowance?: number | null
          id?: string
          medical_allowance?: number | null
          pension_id?: string | null
          profile_id?: string | null
          tax_id?: string | null
          transport_allowance?: number | null
        }
        Update: {
          basic_salary?: number | null
          created_at?: string | null
          housing_allowance?: number | null
          id?: string
          medical_allowance?: number | null
          pension_id?: string | null
          profile_id?: string | null
          tax_id?: string | null
          transport_allowance?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_configs_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_records: {
        Row: {
          allowances: number | null
          base_salary: number | null
          created_at: string | null
          deductions: number | null
          id: string
          net_salary: number | null
          pay_period: string
          payment_method: string | null
          processed_at: string | null
          staff_id: string | null
          status: string | null
        }
        Insert: {
          allowances?: number | null
          base_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          id?: string
          net_salary?: number | null
          pay_period: string
          payment_method?: string | null
          processed_at?: string | null
          staff_id?: string | null
          status?: string | null
        }
        Update: {
          allowances?: number | null
          base_salary?: number | null
          created_at?: string | null
          deductions?: number | null
          id?: string
          net_salary?: number | null
          pay_period?: string
          payment_method?: string | null
          processed_at?: string | null
          staff_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payroll_records_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payroll_runs: {
        Row: {
          created_at: string | null
          id: string
          month: number
          processed_at: string | null
          processed_by: string | null
          status: string | null
          total_payout: number | null
          year: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          month: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          total_payout?: number | null
          year: number
        }
        Update: {
          created_at?: string | null
          id?: string
          month?: number
          processed_at?: string | null
          processed_by?: string | null
          status?: string | null
          total_payout?: number | null
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "payroll_runs_processed_by_fkey"
            columns: ["processed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payslips: {
        Row: {
          allowances_json: Json | null
          basic_salary: number
          created_at: string | null
          deductions_json: Json | null
          id: string
          net_pay: number
          payroll_run_id: string | null
          profile_id: string | null
          status: string | null
        }
        Insert: {
          allowances_json?: Json | null
          basic_salary: number
          created_at?: string | null
          deductions_json?: Json | null
          id?: string
          net_pay: number
          payroll_run_id?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Update: {
          allowances_json?: Json | null
          basic_salary?: number
          created_at?: string | null
          deductions_json?: Json | null
          id?: string
          net_pay?: number
          payroll_run_id?: string | null
          profile_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payslips_payroll_run_id_fkey"
            columns: ["payroll_run_id"]
            isOneToOne: false
            referencedRelation: "payroll_runs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payslips_profile_id_fkey"
            columns: ["profile_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      po_items: {
        Row: {
          created_at: string | null
          id: string
          item_name: string
          po_id: string | null
          quantity: number
          total_price: number | null
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_name: string
          po_id?: string | null
          quantity: number
          total_price?: number | null
          unit_price: number
        }
        Update: {
          created_at?: string | null
          id?: string
          item_name?: string
          po_id?: string | null
          quantity?: number
          total_price?: number | null
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "po_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      prescription_items: {
        Row: {
          created_at: string | null
          dosage: string
          drug_id: string | null
          duration: string
          frequency: string
          id: string
          instructions: string | null
          prescription_id: string | null
          quantity_dispensed: number | null
          quantity_prescribed: number
        }
        Insert: {
          created_at?: string | null
          dosage: string
          drug_id?: string | null
          duration: string
          frequency: string
          id?: string
          instructions?: string | null
          prescription_id?: string | null
          quantity_dispensed?: number | null
          quantity_prescribed: number
        }
        Update: {
          created_at?: string | null
          dosage?: string
          drug_id?: string | null
          duration?: string
          frequency?: string
          id?: string
          instructions?: string | null
          prescription_id?: string | null
          quantity_dispensed?: number | null
          quantity_prescribed?: number
        }
        Relationships: [
          {
            foreignKeyName: "prescription_items_drug_id_fkey"
            columns: ["drug_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescription_items_prescription_id_fkey"
            columns: ["prescription_id"]
            isOneToOne: false
            referencedRelation: "prescriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      prescriptions: {
        Row: {
          created_at: string | null
          id: string
          patient_id: string | null
          provider_id: string | null
          status: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          provider_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string | null
          id?: string
          patient_id?: string | null
          provider_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "prescriptions_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "prescriptions_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string | null
          department_id: string | null
          email: string | null
          file_number: string | null
          first_name: string | null
          id: string
          last_name: string | null
          phone: string | null
          role: string
          staff_number: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          file_number?: string | null
          first_name?: string | null
          id: string
          last_name?: string | null
          phone?: string | null
          role?: string
          staff_number?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          file_number?: string | null
          first_name?: string | null
          id?: string
          last_name?: string | null
          phone?: string | null
          role?: string
          staff_number?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          po_number: string | null
          status: string | null
          supplier_id: string | null
          total_amount: number | null
        }
        Insert: {
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          po_number?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Update: {
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          po_number?: string | null
          status?: string | null
          supplier_id?: string | null
          total_amount?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_orders: {
        Row: {
          body_part: string
          created_at: string | null
          id: string
          modality: string
          patient_id: string | null
          provider_id: string | null
          status: string
        }
        Insert: {
          body_part: string
          created_at?: string | null
          id?: string
          modality: string
          patient_id?: string | null
          provider_id?: string | null
          status?: string
        }
        Update: {
          body_part?: string
          created_at?: string | null
          id?: string
          modality?: string
          patient_id?: string | null
          provider_id?: string | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "radiology_orders_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_orders_provider_id_fkey"
            columns: ["provider_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_reports: {
        Row: {
          created_at: string | null
          findings: string | null
          id: string
          image_url: string | null
          impression: string | null
          order_id: string | null
          radiologist_id: string | null
        }
        Insert: {
          created_at?: string | null
          findings?: string | null
          id?: string
          image_url?: string | null
          impression?: string | null
          order_id?: string | null
          radiologist_id?: string | null
        }
        Update: {
          created_at?: string | null
          findings?: string | null
          id?: string
          image_url?: string | null
          impression?: string | null
          order_id?: string | null
          radiologist_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radiology_reports_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "radiology_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_reports_radiologist_id_fkey"
            columns: ["radiologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      radiology_results: {
        Row: {
          conclusion: string | null
          created_at: string | null
          findings: string | null
          id: string
          image_urls: string[] | null
          is_finalized: boolean | null
          order_id: string | null
          radiologist_id: string | null
          signature_data: string | null
          signed_at: string | null
        }
        Insert: {
          conclusion?: string | null
          created_at?: string | null
          findings?: string | null
          id?: string
          image_urls?: string[] | null
          is_finalized?: boolean | null
          order_id?: string | null
          radiologist_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
        }
        Update: {
          conclusion?: string | null
          created_at?: string | null
          findings?: string | null
          id?: string
          image_urls?: string[] | null
          is_finalized?: boolean | null
          order_id?: string | null
          radiologist_id?: string | null
          signature_data?: string | null
          signed_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "radiology_results_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "radiology_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "radiology_results_radiologist_id_fkey"
            columns: ["radiologist_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      referrals: {
        Row: {
          created_at: string | null
          destination_hospital: string
          id: string
          patient_id: string
          priority: string | null
          reason: string
          referral_date: string | null
          referred_by: string
          status: string | null
        }
        Insert: {
          created_at?: string | null
          destination_hospital: string
          id?: string
          patient_id: string
          priority?: string | null
          reason: string
          referral_date?: string | null
          referred_by: string
          status?: string | null
        }
        Update: {
          created_at?: string | null
          destination_hospital?: string
          id?: string
          patient_id?: string
          priority?: string | null
          reason?: string
          referral_date?: string | null
          referred_by?: string
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "referrals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "referrals_referred_by_fkey"
            columns: ["referred_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      rooms: {
        Row: {
          created_at: string | null
          department_id: string | null
          id: string
          is_active: boolean | null
          name: string
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name: string
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
        }
        Relationships: [
          {
            foreignKeyName: "consultation_rooms_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      staff_shifts: {
        Row: {
          created_at: string | null
          end_time: string
          id: string
          shift_type: string
          staff_id: string | null
          start_time: string
        }
        Insert: {
          created_at?: string | null
          end_time: string
          id?: string
          shift_type: string
          staff_id?: string | null
          start_time: string
        }
        Update: {
          created_at?: string | null
          end_time?: string
          id?: string
          shift_type?: string
          staff_id?: string | null
          start_time?: string
        }
        Relationships: [
          {
            foreignKeyName: "staff_shifts_staff_id_fkey"
            columns: ["staff_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      stock_movements: {
        Row: {
          created_at: string | null
          id: string
          item_id: string | null
          quantity: number
          recorded_by: string | null
          source_destination: string | null
          type: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity: number
          recorded_by?: string | null
          source_destination?: string | null
          type: string
        }
        Update: {
          created_at?: string | null
          id?: string
          item_id?: string | null
          quantity?: number
          recorded_by?: string | null
          source_destination?: string | null
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "stock_movements_item_id_fkey"
            columns: ["item_id"]
            isOneToOne: false
            referencedRelation: "inventory_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stock_movements_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          category: string | null
          code: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          name: string
          phone: string | null
        }
        Insert: {
          category?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          phone?: string | null
        }
        Update: {
          category?: string | null
          code?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          address: string | null
          currency_position: string | null
          currency_symbol: string | null
          default_currency: string | null
          email: string | null
          hospital_name: string | null
          id: string
          insurance_providers: string[] | null
          payment_methods: string[] | null
          phone: string | null
          tax_rate: number | null
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          currency_position?: string | null
          currency_symbol?: string | null
          default_currency?: string | null
          email?: string | null
          hospital_name?: string | null
          id?: string
          insurance_providers?: string[] | null
          payment_methods?: string[] | null
          phone?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          currency_position?: string | null
          currency_symbol?: string | null
          default_currency?: string | null
          email?: string | null
          hospital_name?: string | null
          id?: string
          insurance_providers?: string[] | null
          payment_methods?: string[] | null
          phone?: string | null
          tax_rate?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      vitals: {
        Row: {
          bmi: number | null
          bp_diastolic: number | null
          bp_systolic: number | null
          heart_rate: number | null
          height: number | null
          id: string
          patient_id: string | null
          recorded_at: string | null
          recorded_by: string | null
          sp_o2: number | null
          temperature: number | null
          weight: number | null
        }
        Insert: {
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          heart_rate?: number | null
          height?: number | null
          id?: string
          patient_id?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          sp_o2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Update: {
          bmi?: number | null
          bp_diastolic?: number | null
          bp_systolic?: number | null
          heart_rate?: number | null
          height?: number | null
          id?: string
          patient_id?: string | null
          recorded_at?: string | null
          recorded_by?: string | null
          sp_o2?: number | null
          temperature?: number | null
          weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "vitals_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "vitals_recorded_by_fkey"
            columns: ["recorded_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      walkin_queue: {
        Row: {
          check_in_time: string | null
          created_at: string | null
          department_id: string | null
          id: string
          patient_id: string | null
          priority: string
          reason: string | null
          room_id: string | null
          status: string
          token_number: string | null
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          patient_id?: string | null
          priority?: string
          reason?: string | null
          room_id?: string | null
          status?: string
          token_number?: string | null
        }
        Update: {
          check_in_time?: string | null
          created_at?: string | null
          department_id?: string | null
          id?: string
          patient_id?: string | null
          priority?: string
          reason?: string | null
          room_id?: string | null
          status?: string
          token_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "walkin_queue_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walkin_queue_patient_id_fkey"
            columns: ["patient_id"]
            isOneToOne: false
            referencedRelation: "patients"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "walkin_queue_room_id_fkey"
            columns: ["room_id"]
            isOneToOne: false
            referencedRelation: "rooms"
            referencedColumns: ["id"]
          },
        ]
      }
      wards: {
        Row: {
          created_at: string | null
          floor: string | null
          id: string
          name: string
          type: string
        }
        Insert: {
          created_at?: string | null
          floor?: string | null
          id?: string
          name: string
          type: string
        }
        Update: {
          created_at?: string | null
          floor?: string | null
          id?: string
          name?: string
          type?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      adjust_inventory: {
        Args: {
          movement_reason?: string
          quantity_delta: number
          target_item_id: string
        }
        Returns: number
      }
      complete_consultation: {
        Args: {
          billing_items?: Json
          diagnosis_code?: string
          diagnosis_description?: string
          lab_tests?: Json
          note_assessment?: string
          note_objective?: string
          note_plan?: string
          note_subjective?: string
          prescribed_items?: Json
          radiology_studies?: Json
          target_patient_id: string
          target_queue_id: string
        }
        Returns: Json
      }
      dispense_prescription: {
        Args: { target_prescription_id: string }
        Returns: undefined
      }
      log_blood_donation: {
        Args: {
          p_blood_group: string
          p_component_type?: string
          p_donor_contact: string
          p_donor_name: string
          p_expires_on?: string
          p_quantity_ml: number
        }
        Returns: string
      }
      record_invoice_payment: {
        Args: {
          method: string
          payment_amount: number
          reference?: string
          target_invoice_id: string
        }
        Returns: string
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
