import { Providers } from './providers';
import { UpwellingApp } from '@/components/UpwellingApp';

export default function HomePage() {
  return (
    <Providers>
      <UpwellingApp />
    </Providers>
  );
}
