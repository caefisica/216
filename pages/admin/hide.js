import { supabase } from '../../supabase';
import { useState } from 'react';

/**
 * HideBook component allows hiding a book based on slug.
 * @return {JSX.Element} The rendered component.
 */
export default function HideBook() {
  const [slug, setSlug] = useState('');

  const hideBook = async () => {
    const { error } = await supabase
      .from('books')
      .update({ visible: false })
      .eq('slug', slug);

    if (error) {
      console.error('Error: ', error);
    } else {
      console.log('Book hidden successfully!');
    }
  };

  return (
    <div>
      <input
        value={slug}
        onChange={(e) => setSlug(e.target.value)}
        placeholder="Slug of the book"
      />
      <button onClick={hideBook}>Hide Book</button>
    </div>
  );
}
