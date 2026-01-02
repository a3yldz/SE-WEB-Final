import { useEffect } from 'react';

/**
 * Custom hook to update the document title dynamically.
 * @param title - The title to set for the current page.
 */
export function usePageTitle(title: string) {
    useEffect(() => {
        const prevTitle = document.title;
        document.title = `RescueApp | ${title}`;

        return () => {
            document.title = prevTitle;
        };
    }, [title]);
}
