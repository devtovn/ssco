# Product Price Comparison Website - Frontend

This is the frontend application for the Product Price Comparison Website, built with Next.js 14, TypeScript, and Tailwind CSS.

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Headless UI
- **State Management**: Zustand
- **PWA**: Next-PWA
- **Code Quality**: ESLint, Prettier

## Getting Started

### Prerequisites

- Node.js 20 LTS or higher
- npm or yarn

### Installation

1. Install dependencies:
```bash
npm install
```

2. Copy environment variables:
```bash
cp .env.example .env.local
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run format` - Format code with Prettier
- `npm run format:check` - Check code formatting
- `npm run type-check` - Run TypeScript type checking

## Project Structure

```
frontend/
├── app/                    # Next.js App Router pages
│   ├── layout.tsx         # Root layout
│   ├── page.tsx           # Home page
│   └── globals.css        # Global styles
├── components/            # React components
│   ├── ui/               # Basic UI components
│   ├── layout/           # Layout components
│   └── features/         # Feature-specific components
├── lib/                   # Utilities and shared logic
│   ├── api/              # API client functions
│   ├── utils/            # Utility functions
│   ├── hooks/            # Custom React hooks
│   └── store/            # Zustand stores
├── types/                 # TypeScript type definitions
├── public/               # Static assets
└── next.config.js        # Next.js configuration
```

## Features

- ✅ Next.js 14 with App Router
- ✅ TypeScript for type safety
- ✅ Tailwind CSS for styling
- ✅ Headless UI components
- ✅ Zustand for state management
- ✅ Progressive Web App (PWA) support
- ✅ ESLint and Prettier configured
- ✅ Mobile-first responsive design
- ✅ SEO optimized

## Requirements Validation

This implementation satisfies the following requirements:

- **Requirement 8.2**: Mobile and tablet optimized responsive design
- **Requirement 8.3**: Responsive design across all screen sizes (320px to 4K)
- **Requirement 8.6**: PWA features for better mobile experience

## Learn More

- [Next.js Documentation](https://nextjs.org/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Zustand Documentation](https://zustand-demo.pmnd.rs/)
- [Headless UI Documentation](https://headlessui.com/)
