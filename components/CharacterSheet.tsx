
import React from 'react';
import type { Character } from '../types';
import { Realm, RealmStages, OrderedRealms, Faction, AllFactions } from '../types';

interface CharacterSheetProps {
  character: Character;
  // onUpdateCharacter is kept for potential future use or programmatic updates,
  // but direct UI edits through this sheet are now disabled.
  onUpdateCharacter: (updates: Partial<Character>) => void; 
}

const CharacterSheet: React.FC<CharacterSheetProps> = ({ character, onUpdateCharacter }) => {
  // These handlers would be invoked if fields were enabled.
  // For now, they are kept if we decide to enable editing in some other context.
  const handleRealmChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newRealm = e.target.value as Realm;
    const newStage = RealmStages[newRealm][0]; 
    onUpdateCharacter({ realm: newRealm, stage: newStage });
  };

  const handleStageChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateCharacter({ stage: e.target.value });
  };

  const handleFactionChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    onUpdateCharacter({ faction: e.target.value as Faction });
  };
  
  const handleLocationChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onUpdateCharacter({ location: e.target.value });
  };

  const currentStages = RealmStages[character.realm] || [];
  const isEditable = false; // Fields are not editable once the game starts and CharacterSheet is displayed

  const commonInputClasses = "w-full bg-slate-700 border border-slate-600 rounded-md py-2 px-3 text-slate-100 focus:ring-sky-500 focus:border-sky-500";
  const disabledInputClasses = "disabled:bg-slate-700/70 disabled:opacity-70 disabled:cursor-not-allowed disabled:text-slate-400";


  return (
    <div className="bg-slate-800 p-6 rounded-lg shadow-xl space-y-4 sticky top-4">
      <h2 className="text-2xl font-bold text-sky-400 border-b border-slate-700 pb-2 mb-4">Nhân Vật: {character.name}</h2>
      
      <div>
        <label htmlFor="realm" className="block text-sm font-medium text-sky-300 mb-1">Cảnh Giới</label>
        <select
          id="realm"
          value={character.realm}
          onChange={handleRealmChange}
          disabled={!isEditable}
          className={`${commonInputClasses} ${disabledInputClasses}`}
        >
          {OrderedRealms.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="stage" className="block text-sm font-medium text-sky-300 mb-1">Tiểu Cảnh</label>
        <select
          id="stage"
          value={character.stage}
          onChange={handleStageChange}
          disabled={!isEditable || currentStages.length === 0}
          className={`${commonInputClasses} ${disabledInputClasses}`}
        >
          {currentStages.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="faction" className="block text-sm font-medium text-sky-300 mb-1">Thế Lực</label>
        <select
          id="faction"
          value={character.faction}
          onChange={handleFactionChange}
          disabled={!isEditable}
          className={`${commonInputClasses} ${disabledInputClasses}`}
        >
          {AllFactions.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>

      <div>
        <label htmlFor="location" className="block text-sm font-medium text-sky-300 mb-1">Vị Trí Hiện Tại</label>
        <input
          type="text"
          id="location"
          value={character.location}
          onChange={handleLocationChange}
          disabled={!isEditable}
          className={`${commonInputClasses} ${disabledInputClasses}`}
          placeholder="Ví dụ: Thạch Thôn, Thái Huyền Môn..."
        />
      </div>
      <p className="text-xs text-slate-500 italic mt-2">
        Thông tin nhân vật sẽ được cập nhật tự động dựa trên diễn biến cốt truyện.
      </p>
    </div>
  );
};

export default CharacterSheet;
