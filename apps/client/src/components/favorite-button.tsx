import { AppButton } from './app-button';

type FavoriteButtonProps = {
  storyTitle: string;
  isFavorite: boolean;
  onToggle: () => void;
};

export function FavoriteButton({ storyTitle, isFavorite, onToggle }: FavoriteButtonProps) {
  const label = isFavorite
    ? `Remove ${storyTitle} from favorites`
    : `Save ${storyTitle} to favorites`;

  return (
    <AppButton
      variant={isFavorite ? 'secondary' : 'primary'}
      label={isFavorite ? 'Remove favorite' : 'Save favorite'}
      onPress={onToggle}
      accessibilityLabel={label}
    />
  );
}
