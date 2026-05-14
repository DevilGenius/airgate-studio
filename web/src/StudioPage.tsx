import { StudioProvider } from './studio/StudioContext';
import { StudioView } from './studio/StudioView';

export default function StudioPage() {
  return (
    <StudioProvider>
      <StudioView />
    </StudioProvider>
  );
}
