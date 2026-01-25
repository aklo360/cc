# Repo Wrapped

A beautiful Spotify Wrapped-style summary for GitHub repositories.

## Features

✨ **Interactive Slides** - Navigate through 6 stunning slides showcasing repository data
🎨 **Dark Theme Design** - Beautiful gradient backgrounds with glassmorphism effects
📊 **Data Visualization** - Language breakdown, file stats, commit patterns, and activity graphs
🎭 **Coding Personality** - Fun personality analysis based on repository patterns
🚀 **Instant Preview** - Pre-filled with example repo, clickable immediately on page load

## Structure

- `page.tsx` - Main entry point with input form and loading states
- `components/RepoAnalysis.tsx` - Main slideshow component with 6 slides:
  1. **Languages** - Top programming languages with animated progress bars
  2. **Files** - Total files, lines of code, and largest file stats
  3. **Commits** - Total commits with peak activity times
  4. **Activity** - Weekly commit pattern visualization
  5. **Personality** - Coding personality type with traits
  6. **Summary** - Final wrap-up with key metrics
- `components/WrapUp.tsx` - Final summary slide with share functionality
- `wrapped.css` - Custom animations for slide transitions

## UX Features (Critical Requirements)

✅ **Immediately Clickable** - "Unwrap My Repo" button is enabled on page load
✅ **Pre-filled Input** - Default value set to `vercel/next.js`
✅ **Quick Examples** - One-click buttons for popular repos
✅ **No Barriers** - All primary actions available without user input

## Technical Details

- **Framework**: Next.js 16+ (App Router)
- **Styling**: Tailwind CSS v4 with custom gradients
- **Interactivity**: React hooks for state management
- **Build**: Static HTML export compatible
- **Data**: Simulated for demo purposes (can be connected to GitHub API)

## Design Highlights

- Spotify Wrapped-inspired visual style
- Gradient backgrounds (purple → black → indigo)
- Glassmorphism cards with backdrop blur
- Smooth slide transitions with animations
- Responsive design for all screen sizes
- Interactive hover effects and button states

## Demo Flow

1. Landing page with GitHub repo URL input (pre-filled)
2. Click "Unwrap My Repo" or select from popular repos
3. Loading animation (2 seconds for dramatic effect)
4. Navigate through 6 slides using Next/Previous or dot indicators
5. Final summary with share and reset options

## Notes

This is a demo implementation with simulated data. In production, you would:
- Integrate with GitHub API for real repository data
- Add authentication for private repos
- Implement actual sharing functionality
- Cache results for performance
- Add error handling for invalid repos
