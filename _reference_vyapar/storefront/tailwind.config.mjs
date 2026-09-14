/** @type {import('tailwindcss').Config} */
export default {
	content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
	theme: {
		extend: {
			colors: {
				primary: {
					DEFAULT: 'var(--theme-primary, #234B34)', // Dark Forest Green
					light: 'var(--theme-primary-light, #4F8A43)',   // Leaf Green
				},
				secondary: {
					DEFAULT: 'var(--theme-secondary, #1E5B63)', // Deep Teal
				},
				accent: {
					DEFAULT: 'var(--theme-accent, #C9A15B)', // Gold
					orange: 'var(--theme-accent-warm, #D97A1E)',  // Carrot/Haldi
					olive: 'var(--theme-primary-light, #6C8B4F)',   // Olive Green
					brown: 'var(--theme-accent-warm, #9B623C)',   // Warm Brown
				},
				background: {
					DEFAULT: 'var(--theme-background, #F6F2E8)', // Soft Cream
					alt: 'var(--theme-background-alt, #E8D4B0)',     // Light Beige
				},
				surface: {
					DEFAULT: 'var(--theme-surface, #FAF8F2)', // White/Cream
				}
			},
			fontFamily: {
				sans: ['Inter', 'sans-serif'],
				serif: ['"Playfair Display"', 'serif'],
			},
			keyframes: {
				marquee: {
					'0%': { transform: 'translateX(0%)' },
					'100%': { transform: 'translateX(-50%)' },
				},
				'pop-bounce': {
					'0%, 100%': { transform: 'scale(1)' },
					'50%': { transform: 'scale(1.15)' },
				}
			},
			animation: {
				marquee: 'marquee 30s linear infinite',
				'pop-bounce': 'pop-bounce 2s ease-in-out infinite',
			}
		},
	},
	plugins: [],
}
