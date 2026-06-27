export interface NutritionInfo {
  calories: number;
  protein: number;
  fat: number;
  carbs: number;
}

export interface RecipeItem {
  title: string;
  description: string;
  steps: string[];
  nutrition: NutritionInfo;
  imageUrl?: string;
}

export interface AnalyzeRecipesResponse {
  ingredients: string[];
  recipes: RecipeItem[];
}

export interface UploadedImage {
  buffer: Buffer;
  mimeType: string;
  originalName: string;
  sizeBytes: number;
}
