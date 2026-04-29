# Deck Spec (Working Draft)

---

## Slide 01

* title: Role-Based SharePoint Resource Center

* purpose: introduce project, sponsor, and context

* key_message: we built a role-based internal platform for SBPD

* time: 0:30

* presenter: -

* on_slide_text:

    * Santa Barbara County Public Defender’s Office
    * Role-Based Internal Platform for Targeted Content Delivery
    * CS 4961/4962 · Cal State LA · May 1, 2026
    * Advisor: Dr. Chengyu Sun · Client: Luis Ramirez

* visuals:

    * clean academic title slide, dark blue gradient

* issues:

    * title could be shorter / more impactful

---

## Slide 02

* title: Meet the Team

* purpose: establish credibility and contributors

* key_message: this was built by a full 10-person engineering team

* time: 1:00

* presenter: -

* on_slide_text:

    * (team list)

* visuals:

    * grid of team member cards

* issues:

    * ensure advisor + client included

---

## Slide 03

* title: The Problem: Scattered Resources, No Role Control

* purpose: establish need for system

* key_message: current system is fragmented and unscalable

* time: 2:00

* presenter: Krystal

* on_slide_text:

    * fragmented information
    * no role-based access
    * manual permissions

* visuals:

    * messy SharePoint screenshot vs structured layout

* issues:

    * could sharpen phrasing

---

## Slide 04

* title: Before vs After: From Scattered to Structured

* purpose: show transformation at a high level

* key_message: we replaced fragmentation with a unified, role-aware system

* time: 1:30

* presenter: Krystal

* on_slide_text:

    * before: scattered, manual, inconsistent
    * after: centralized, automated, role-based

* visuals:

    * side-by-side comparison

* issues:

    * ensure contrast is visually strong

---

## Slide 05

* title: Tech Stack Decision: Why SPFx

* purpose: justify technical approach

* key_message: SPFx provides required flexibility over low-code options

* time: 2:00

* presenter: -

* on_slide_text:

    * SharePoint is required (SBPD intranet)
    * low-code: limited control
    * SPFx: full customization
    * decision: SPFx

* visuals:

    * comparison diagram (low-code vs SPFx)

* issues:

    * emphasize fall semester experimentation

---

## Slide 06

* title: System Architecture

* purpose: show how system components connect

* key_message: system integrates AD, Entra, SharePoint, SPFx, and PowerBI

* time: 2:00

* presenter: -

* on_slide_text:

    * On-Prem AD → Entra → SharePoint → SPFx → UI

* visuals:

    * pipeline architecture diagram

* issues:

    * ensure diagram is readable at distance

---

## Slide 07

* title: Role-Based Access: One Site, Nine Experiences

* purpose: explain core system concept

* key_message: one system dynamically adapts based on user role

* time: 2:00

* presenter: Alondra

* on_slide_text:

    * same site, different experience
    * 9 roles, zero manual permissions
    * AD group determines access

* visuals:

    * role cards + IT vs guest contrast

* notes:

    * define CDD, LOP, Trial Supervisor

* issues:

    * avoid screenshots, keep conceptual

---

## Slide 08

* title: Component Overview: 15+ Web Parts

* purpose: show system scope

* key_message: system consists of modular role-based components

* time: 1:30

* presenter: -

* on_slide_text:

    * common components
    * attorney tools
    * CDD tools
    * supervisor / IT tools

* visuals:

    * categorized component grid

* issues:

    * ensure categories are clear

---

## Slide 09

* title: Office Hoteling

* purpose: demonstrate real-world feature

* key_message: enables real-time desk reservation

* time: 2:00

* presenter: Huy

* on_slide_text:

    * real-time booking
    * calendar integration
    * conflict detection

* visuals:

    * (needs UI screenshot)

* issues:

    * currently too conceptual

---

## Slide 10

* title: Attorney Workload Tracker

* purpose: show complex feature

* key_message: enables hierarchical case tracking

* time: 2:00

* presenter: Alyssa

* on_slide_text:

    * location → case type → attorney
    * searchable, filterable
    * live case counts

* visuals:

    * dashboard UI

* issues:

    * strong slide

---

## Slide 11

* title: LOP Procedure Checklist

* purpose: show workflow automation

* key_message: centralizes procedures into searchable workflows

* time: 2:00

* presenter: -

* on_slide_text:

    * workflow management
    * PDF + video integration
    * searchable procedures

* visuals:

    * (missing)

* issues:

    * missing image
    * needs stronger visual explanation

---

## Slide 12

* title: Assignments System

* purpose: show extended functionality

* key_message: supports training, acknowledgement, and tasks

* time: 1:30

* presenter: -

* on_slide_text:

    * training assignments
    * acknowledgement tracking
    * Azure function validation

* visuals:

    * (unclear)

* issues:

    * may be too detailed / niche

---

## Slide 13

* title: CDD Resource Guides

* purpose: show specialized role feature

* key_message: supports capital defense workflows

* time: 1:30

* presenter: Jared

* on_slide_text:

    * categorized resources
    * referral forms
    * role-filtered content

* visuals:

    * (missing)

* issues:

    * lacks visual support

---

## Slide 14

* title: Urgency Portal (PowerBI)

* purpose: show analytics capability

* key_message: enables supervisor decision-making

* time: 1:30

* presenter: Jonathan

* on_slide_text:

    * real-time metrics
    * embedded dashboard
    * restricted access

* visuals:

    * (missing PowerBI screenshot)

* issues:

    * missing key visual

---

## Slide 15

* title: Communication Hub

* purpose: show internal communication system

* key_message: centralizes announcements, directory, and calendar

* time: 1:30

* presenter: -

* on_slide_text:

    * announcements
    * staff directory
    * calendar

* visuals:

    * (missing)

* issues:

    * overlaps with other features

---

## Slide 16

* title: Impact & Lessons Learned

* purpose: conclude presentation

* key_message: system is impactful and required significant engineering effort

* time: 1:00

* presenter: -

* on_slide_text:

    * 9 roles
    * 0 manual steps
    * 15+ components
    * lessons learned

* visuals:

    * metrics + reflection split

* issues:

    * could be more concise
