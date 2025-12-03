# Bilgi Ağacı - Product Specification

## Overview

Bilgi Ağacı is an anonymous gift-exchange and matching platform for Istanbul Bilgi University students. Inspired by manzaraliagac.com.tr, it connects students based on shared interests and availability for in-person meetups.

## Target Audience

- Istanbul Bilgi University students with @bilgi.edu.tr email addresses

## Core Features

### 1. Authentication
- Email/password signup with Bilgi University email validation (@bilgi.edu.tr only)
- Email confirmation flow
- Login/logout functionality

### 2. User Profile
- Basic information: Name, Department, Class Year
- Interest selection (multi-select chips)
- Gift preferences
- About me text
- Active/inactive status

### 3. Availability Management
- Users can add multiple availability slots
- Each slot includes: Date, Start Time, End Time, Campus (optional), Location (optional)
- Users can delete existing slots

### 4. Matching System
- Algorithm considers:
  - Overlapping availability slots (minimum 30 minutes)
  - Interest similarity score (Jaccard index)
- Greedy matching ensures each user is matched at most once
- Generates unique meeting codes (format: BILGI-XXXX)
- Admin-triggered matching process

### 5. Match View
- Shows meeting details (date, time, location, code)
- Displays partner's interests and gift preferences (not identity)
- Meeting tips and guidelines

### 6. Contact Form
- Accessible from footer
- Fields: Name, Email, Message
- Stored in database for admin review

## Pages

1. **Landing Page** (/)
   - Hero section with title, description, CTAs
   - Countdown to event date
   - How it works (5 steps)
   - How we meet banner
   - Footer with contact button

2. **Signup Page** (/signup)
   - Registration form with email validation

3. **Login Page** (/login)
   - Email/password login

4. **Profile Page** (/profile) - Protected
   - Profile editing form
   - Interest selector
   - Gift preference selector

5. **Availability Page** (/availability) - Protected
   - Add/remove availability slots

6. **Match Page** (/match) - Protected
   - View match details and partner info

7. **Admin Page** (/admin) - Admin only
   - Statistics dashboard
   - Run matching button
   - Contact messages viewer

## Database Schema

### profiles
- user_id (UUID, PK, FK → auth.users)
- name (TEXT)
- email (TEXT)
- department (TEXT)
- class_year (INTEGER)
- interests (TEXT[])
- gift_preferences (TEXT)
- favorite_things (TEXT[])
- about_me (TEXT)
- is_active (BOOLEAN)
- profile_completed (BOOLEAN)
- created_at (TIMESTAMPTZ)
- updated_at (TIMESTAMPTZ)

### availability_slots
- id (UUID, PK)
- user_id (UUID, FK → auth.users)
- slot_date (DATE)
- start_time (TIME)
- end_time (TIME)
- campus (TEXT)
- location (TEXT)
- created_at (TIMESTAMPTZ)

### matches
- id (UUID, PK)
- user_a (UUID, FK → auth.users)
- user_b (UUID, FK → auth.users)
- meeting_date (DATE)
- meeting_start (TIME)
- meeting_end (TIME)
- meeting_location (TEXT)
- meeting_code (TEXT, UNIQUE)
- status (TEXT)
- created_at (TIMESTAMPTZ)

### contact_messages
- id (UUID, PK)
- name (TEXT)
- email (TEXT)
- message (TEXT)
- is_read (BOOLEAN)
- created_at (TIMESTAMPTZ)

## Interest Categories

### Sosyal
- Sohbet etmek
- Yeni insanlarla tanışmak
- Partiler
- Kültürel etkinlikler
- Gönüllülük
- Topluluklar

### Hobiler
- Okumak
- Yazı yazmak
- Müzik dinlemek
- Enstrüman çalmak
- Fotoğrafçılık
- Resim/Çizim
- El işleri
- Yemek yapmak
- Oyun oynamak
- Film/Dizi izlemek
- Podcast dinlemek

### Aktif Yaşam
- Spor yapmak
- Yoga/Meditasyon
- Yürüyüş
- Bisiklet
- Dans
- Doğa gezileri
- Seyahat

### Akademik
- Araştırma
- Tartışma
- Dil öğrenmek
- Kodlama
- Tasarım
- Girişimcilik

## Gift Preferences
- Kitap
- Kırtasiye
- Yiyecek/İçecek
- El yapımı hediye
- Aksesuar
- Bitki
- Mum/Koku
- Çikolata
- Oyun
- Sürpriz olsun

## Campus Options
- santralistanbul
- Kuştepe
- Dolapdere

## Design System

### Colors
- Bilgi Red: #E31E24
- Dark Background: #0D0D0D
- Dark Card: #151515
- Gold Accent: #FFD700
- Text Primary: #FFFFFF
- Text Secondary: #A0A0A0
- Border: #2A2A2A

### Typography
- Headings: Poppins
- Body: Inter

### Effects
- Stars background with twinkling animation
- Gradient text effects
- Card glow on hover
- Smooth transitions

## Matching Algorithm Pseudocode

\`\`\`
function runMatching():
    users = loadActiveUsersWithProfiles()
    slots = loadAllAvailabilitySlots()
    
    candidates = []
    for each pair (userA, userB) in users:
        overlap = findOverlappingSlot(userA.slots, userB.slots)
        if overlap exists (>= 30 minutes):
            score = calculateInterestSimilarity(userA.interests, userB.interests)
            candidates.add({userA, userB, score, overlap})
    
    candidates.sortByScore(descending)
    
    matched = Set()
    finalMatches = []
    
    for candidate in candidates:
        if candidate.userA not in matched AND candidate.userB not in matched:
            match = createMatch(candidate)
            finalMatches.add(match)
            matched.add(candidate.userA)
            matched.add(candidate.userB)
    
    saveMatches(finalMatches)
    return finalMatches
\`\`\`

## Admin Configuration
- Admin emails defined in constants
- Admin-only route protection
- Matching triggered manually by admin
