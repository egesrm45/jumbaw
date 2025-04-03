import { useQuery } from '@tanstack/react-query';
import { Category, Topic } from '@/types/forum';
import { useState, useEffect } from 'react';

export function useCategories() {
  return useQuery({
    queryKey: ['/api/categories'],
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useTopicsByCategoryId(categoryId: number | null) {
  return useQuery({
    queryKey: categoryId ? [`/api/categories/${categoryId}/topics`] : null,
    enabled: !!categoryId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

// This combines categories and topics into a nested structure for the sidebar
export function useCategoriesWithTopics() {
  const categoriesQuery = useCategories();
  const [topicsData, setTopicsData] = useState<Record<number, Topic[]>>({});
  const [isLoadingTopics, setIsLoadingTopics] = useState(false);
  const [topicsError, setTopicsError] = useState<Error | null>(null);
  
  const { data: categories, isLoading: isCategoriesLoading, error: categoriesError } = categoriesQuery;
  
  // Fetch topics for each category
  useEffect(() => {
    const fetchTopics = async () => {
      if (!categories || categories.length === 0) return;
      
      setIsLoadingTopics(true);
      setTopicsError(null);
      
      const topicsMap: Record<number, Topic[]> = {};
      let hasError = false;
      
      try {
        // Create an array of promises for each category's topics
        const promises = categories.map(async (category: Category) => {
          try {
            const response = await fetch(`/api/categories/${category.id}/topics`);
            if (!response.ok) throw new Error(`Failed to fetch topics for category ${category.id}`);
            
            const topics = await response.json();
            topicsMap[category.id] = topics;
          } catch (error) {
            console.error(`Error fetching topics for category ${category.id}:`, error);
            topicsMap[category.id] = [];
            hasError = true;
          }
        });
        
        await Promise.all(promises);
      } catch (error) {
        console.error('Error fetching topics:', error);
        setTopicsError(error instanceof Error ? error : new Error('Unknown error fetching topics'));
        hasError = true;
      } finally {
        setTopicsData(topicsMap);
        setIsLoadingTopics(false);
      }
    };
    
    fetchTopics();
  }, [categories]);
  
  // Process all the data into a single categoriesWithTopics array
  const categoriesWithTopics = categories?.map((category: Category) => {
    return {
      ...category,
      topics: topicsData[category.id] || [],
      isTopicsLoading: isLoadingTopics,
      topicsError: topicsError
    };
  });
  
  return {
    categoriesWithTopics,
    isLoading: isCategoriesLoading || isLoadingTopics,
    error: categoriesError || topicsError
  };
}
