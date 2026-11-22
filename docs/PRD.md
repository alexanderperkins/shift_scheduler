# Event Shift Scheduler: PRD

## Problem
Clubs, campus events, and nonprofits schedule volunteer shifts in spreadsheets and group chats, so shifts go understaffed or volunteers get double-booked.

## Roles
- Organizer: creates events and shifts, assigns volunteers, publishes the schedule
- Volunteer: sees their shifts and hours
- Org admin: manages organizers and the organization

## User stories
1. As an organizer, I can create shifts with a start, end, minimum staff, and maximum staff, so coverage needs are clear.
2. As an organizer, I can see each shift's staffing status (understaffed, covered, overstaffed), so I know where to act.
3. As an organizer, I am warned when a volunteer is double-booked, so no one is scheduled twice at once.
4. As a volunteer, I can see my assigned shifts, so I know when to show up.
5. As an org admin, I can manage who is an organizer, so access stays controlled.

## Shift fields
id, eventId, start, end, minStaff, maxStaff, cancelled, assignedVolunteerIds

## Staffing status rules
- understaffed: fewer assigned than minStaff
- covered: at least minStaff and at most maxStaff
- overstaffed: more assigned than maxStaff

## Conflict rules
- Two shifts conflict if they overlap in time for the same volunteer
- Back-to-back shifts (one ends when the next starts) do not conflict
- Cancelled shifts are ignored

## Out of scope for HW4
Database, login, and deployment come later in P3.
