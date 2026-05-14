# Crew App Implementation Guide

## Overview
The crew app is a mobile-first interface for field crews to view assigned jobs, see materials/estimates, upload photos, and add notes.

## Key Routes

```
/crew                    - Crew app home (job list)
/crew/job/:id           - Job details page
/crew/job/:id/photos    - Photo upload page
```

## Component Structure

### CrewApp.tsx (Main Entry)
```typescript
export default function CrewApp() {
  const { user } = useAuth();
  
  // Show job list for authenticated crew members
  return (
    <div className="min-h-screen bg-gray-50">
      <CrewHeader />
      <CrewJobList />
    </div>
  );
}
```

### CrewJobList.tsx
- Displays all projects
- Highlights jobs assigned to user's crew
- Shows customer name, address, status
- Click to view job details

### CrewJobDetail.tsx
- Shows full job information
- Customer details (name, phone, address)
- Roof specifications
- Materials and estimate
- Damages list
- Upload photo button

### CrewPhotoUpload.tsx
- Camera integration
- Before/after photo capture
- Notes field
- Upload button
- Progress indicator

## Database Queries

### Get Crew Jobs
```typescript
// Get all projects assigned to a crew
db.projects.findMany({
  where: { crewId: user.crewId },
  include: { customer: true, roofSpecs: true, estimates: true }
})
```

### Get Job Details
```typescript
// Get full job with all related data
db.projects.findUnique({
  where: { id: jobId },
  include: {
    customer: true,
    roofSpecs: true,
    estimates: { include: { lineItems: true } },
    damages: true,
    photos: true,
  }
})
```

### Upload Photo
```typescript
// Save photo and associate with project
db.photos.create({
  data: {
    projectId: jobId,
    url: s3Url,
    type: 'before' | 'after' | 'damage' | 'progress',
    notes: userNotes,
    uploadedBy: userId,
    uploadedAt: new Date(),
  }
})
```

## tRPC Procedures

### Crew Procedures
```typescript
crew: {
  // Get all jobs for crew (filtered by crewId)
  getJobs: publicProcedure
    .query(({ ctx }) => db.getCrewJobs(ctx.user.crewId)),
  
  // Get job details
  getJobDetail: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input, ctx }) => db.getJobDetail(input.id, ctx.user.crewId)),
  
  // Upload photo
  uploadPhoto: protectedProcedure
    .input(z.object({
      projectId: z.number(),
      url: z.string(),
      type: z.enum(['before', 'after', 'damage', 'progress']),
      notes: z.string().optional(),
    }))
    .mutation(({ input, ctx }) => db.createPhoto({
      ...input,
      uploadedBy: ctx.user.id,
      uploadedAt: new Date(),
    })),
  
  // Add to Google Calendar
  addToCalendar: protectedProcedure
    .input(z.object({ projectId: z.number() }))
    .mutation(({ input, ctx }) => addJobToGoogleCalendar(input.projectId, ctx.user)),
}
```

## Photo Upload Flow

### Frontend
1. User clicks "Add Photo"
2. Camera opens (mobile) or file picker (desktop)
3. User captures/selects photo
4. Optional: Add notes
5. Click "Upload"
6. Show progress indicator
7. Success message

### Backend
1. Receive photo URL (already uploaded to S3 via separate endpoint)
2. Save photo record to database
3. Return photo data
4. Frontend shows photo in list

## Mobile Optimization

### Responsive Design
- Full-width on mobile
- Touch-friendly buttons (min 48px)
- Large text for readability
- Minimal scrolling

### Performance
- Lazy load photos
- Compress images before upload
- Cache job details locally
- Minimal API calls

### Offline Support
- Store job list locally
- Queue photo uploads
- Sync when internet returns

## Google Calendar Integration

### Add Job to Calendar
```typescript
async function addJobToCalendar(projectId: number, user: User) {
  const project = await db.projects.findUnique({ where: { id: projectId } });
  
  const event = {
    summary: `${project.title} - ${project.customer.name}`,
    description: project.address,
    start: { dateTime: project.startDate },
    end: { dateTime: project.endDate },
  };
  
  return googleCalendar.events.insert({
    calendarId: 'primary',
    resource: event,
  });
}
```

## Security Considerations

### Authentication
- All crew endpoints require authentication
- Verify user has access to project's crew
- Don't expose other crews' jobs

### Authorization
- Crew members can only see their assigned jobs
- Can only upload photos to their assigned jobs
- Can't modify job details

### Data Privacy
- Don't expose customer phone/email to crew (optional)
- Limit photo metadata
- Audit photo uploads

## Testing

### Unit Tests
```typescript
describe('Crew App', () => {
  it('should only show jobs assigned to crew', async () => {
    const jobs = await crew.getJobs();
    expect(jobs.every(j => j.crewId === crew.id)).toBe(true);
  });
  
  it('should upload photo with notes', async () => {
    const photo = await crew.uploadPhoto({
      projectId: 1,
      url: 'https://...',
      type: 'before',
      notes: 'Damage on east side',
    });
    expect(photo.notes).toBe('Damage on east side');
  });
});
```

### E2E Tests
1. Crew member logs in
2. Views job list
3. Clicks on job
4. Sees customer details and materials
5. Takes photo
6. Adds notes
7. Uploads photo
8. Photo appears in office app

## Common Issues & Solutions

### Photos not appearing
- Check S3 upload completed before saving DB record
- Verify photo URL is accessible
- Check browser cache

### Crew not seeing jobs
- Verify crewId is set on project
- Check user.crewId matches project.crewId
- Look at database query results

### Google Calendar sync failing
- Verify Google OAuth token is valid
- Check calendar permissions
- Ensure event data is valid

## Deployment Checklist

- [x] Crew table created in database
- [x] crewId field added to projects
- [ ] tRPC procedures implemented
- [x] Crew app pages built
- [ ] Photo upload working
- [ ] Google Calendar integration tested
- [ ] Mobile responsiveness verified
- [ ] Offline support working
- [ ] Security review completed
- [ ] Performance optimized
