import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import './1colors.css';
import './2mainStyles.css';
import './3initiativeList.css';
import './4addCharacterModal.css';
import './5addConditionModal.css';
import './6conditionsDisplay.css';
import plusIcon from './media/plus-icon.png';
import rightArrow from './media/right.png'
import leftArrow from './media/left.png'
import './7settingsModal.css';
import gearIcon from './media/gear-icon.png';
import './8customConditionModal.css';
import pencilIcon from './media/Quill_Edit_Icon.png';
import trashcanIcon from './media/Circle_X_Delete_Icon.png';
import infoIcon from './media/information-button.png';
import cornerBorder from './media/corner-border.png';
import './9deleteCharacterModal.css';
import './16tutorialModal.css';
import AdSlot from './components/AdSlot';
import ToolPageFooter from './components/ToolPageFooter';
import EmailSignup from './components/EmailSignup';
import { setMetaDescription, setCanonical } from "./utils/seo";
import { createSession, getSession, sessionWsUrl } from './API/initiative/sessions';


export default function MainCode() {
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia('(max-width: 767px)').matches : false
  );
  const [isTabletLayout, setIsTabletLayout] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(min-width: 600px) and (max-width: 1024px)').matches
      : false
  );
  const [showArmorClass, setShowArmorClass] = useState(
    JSON.parse(localStorage.getItem('show-armor-class')) ?? true
  );
  const [viewArmorClassToggle, setViewArmorClassToggle] = useState(true);
  const [showHitPoints, setShowHitPoints] = useState(
    JSON.parse(localStorage.getItem('show-hit-points')) ?? true
  );
  const [viewHitPointsToggle, setViewHitPointsToggle] = useState(true);
  const [resetRound, setResetRound] = useState(false);
  const [resetInitiative, setResetInitiative] = useState(false);
  const [removeAllConditions, setRemoveAllConditions] = useState(false);
  const [removeNeutral, setRemoveNeutral] = useState(false);
  const [removeEnemies, setRemoveEnemies] = useState(false);
  const [removeAllies, setRemoveAllies] = useState(false);
  const [removePlayers, setRemovePlayers] = useState(false);
  const [fillCharacters, setFillCharacters] = useState(false);

  const [sessionMode, setSessionMode] = useState(null); // null | 'hosting' | 'join-input' | 'joining'
  const [activeSessionCode, setActiveSessionCode] = useState('');
  const [joinCodeInput, setJoinCodeInput] = useState('');
  const [joinError, setJoinError] = useState('');
  const [hostError, setHostError] = useState('');
  const [isSessionLoading, setIsSessionLoading] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [hostTemporarilyDisconnected, setHostTemporarilyDisconnected] = useState(false);

  const HELP_STORAGE_KEY = "initiative_help_hidden_v1";
  const [helpHidden, setHelpHidden] = useState(false);
  const [learnMoreOpen, setLearnMoreOpen] = useState(true);

  const showHelp = () => {
    setHelpHidden(false);
    setLearnMoreOpen(true);
    localStorage.setItem(HELP_STORAGE_KEY, "false");
  };

  const [errorMessage, setErrorMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(null);
  const [isTutorialModalOpen, setIsTutorialModalOpen] = useState(false);
  const [isGuidedTutorialModalOpen, setIsGuidedTutorialModalOpen] = useState(false);
  const [guidedTutorialStep, setGuidedTutorialStep] = useState(1);
  const [guidedTutorialSpotlights, setGuidedTutorialSpotlights] = useState([]);
  const [isAddConditionModalOpen, setIsAddConditionModalOpen] = useState(null);
  const [characterName, setCharacterName] = useState('');
  const [affiliation, setAffiliation] = useState('');
  const [addSummons, setAddSummons] = useState(false);
  const [summonNames, setSummonNames] = useState(['']);
  const [multipleEnemiesType, setMultipleEnemiesType] = useState(false);
  const [enemyTypeCount, setEnemyTypeCount] = useState('');
  const [enemyCountExceededLimit, setEnemyCountExceededLimit] = useState(false);
  const [nameIndividualEnemies, setNameIndividualEnemies] = useState(false);
  const [enemyIndividualNames, setEnemyIndividualNames] = useState([]);
  const [mobileCharacterDetailModal, setMobileCharacterDetailModal] = useState(null);
  const [mobileEnemyModalStep, setMobileEnemyModalStep] = useState('setup');
  const [mobileSummonsConfirmed, setMobileSummonsConfirmed] = useState(false);
  const [mobileEnemiesConfirmed, setMobileEnemiesConfirmed] = useState(false);
  const summonInputRefs = useRef([]);
  const enemyNameInputRefs = useRef([]);
  const nextSummonFocusIndexRef = useRef(null);
  const initiativeListContentRef = useRef(null);
  const pendingActiveRowDataIndexRef = useRef(null);
  const wsRef = useRef(null);
  const isSyncingFromWs = useRef(false);
  const hostDisconnectTimerRef = useRef(null);
  const supportsGroupedIndividuals = (selectedAffiliation) =>
    ['Enemy', 'Ally', 'Neutral/Environmental'].includes(selectedAffiliation);

  const [round, setRound] = useState(JSON.parse(localStorage.getItem('round')) ?? 1);

  const [rowVisibility, setRowVisibility] = useState(JSON.parse(localStorage.getItem('row-visibility')) ??
    Array(20).fill(false).map((_, index) => index === 0)
  );

  const [overlayActive, setOverlayActive] = useState(JSON.parse(localStorage.getItem('overlay-active')) ??
    Array(20).fill(false).map((_, index) => index === 0)
  );

  const [rowData, setRowData] = useState(JSON.parse(localStorage.getItem('row-data')) ??
    Array(20).fill({ name: '', affiliation: '', initiative: null, conditions: [], summons: [], summonConditions: {} })
  );

  const [shiftedRowIndex, setShiftedRowIndex] = useState(JSON.parse(localStorage.getItem('shifted-row-index')) ?? null);
  const [wiggleShiftedRowIndex, setWiggleShiftedRowIndex] = useState(null);
  const skipInitialShiftWiggleRef = useRef(true);
  const shiftWiggleTimeoutRef = useRef(null);

  const [customConditions, setCustomConditions] = useState(JSON.parse(localStorage.getItem("custom-conditions")) ?? []);

  const [conditionColors, setConditionColors] = useState(JSON.parse(localStorage.getItem("condition-colors")) ?? {
    Blinded: 'var(--bad-condition-background)',
    Charmed: 'var(--bad-condition-background)',
    Deafened: 'var(--bad-condition-background)',
    Frightened: 'var(--bad-condition-background)',
    Grappled: 'var(--bad-condition-background)',
    Incapacitated: 'var(--bad-condition-background)',
    Invisible: 'var(--good-condition-background)',
    Paralyzed: 'var(--bad-condition-background)',
    Petrified: 'var(--bad-condition-background)',
    Poisoned: 'var(--bad-condition-background)',
    Prone: 'var(--neutral-condition-background)',
    Restrained: 'var(--bad-condition-background)',
    Stunned: 'var(--bad-condition-background)',
    Unconscious: 'var(--bad-condition-background)',
    'Exhaustion1': 'var(--bad-condition-background)',
    'Exhaustion2': 'var(--bad-condition-background)',
    'Exhaustion3': 'var(--bad-condition-background)',
    'Exhaustion4': 'var(--bad-condition-background)',
    'Exhaustion5': 'var(--bad-condition-background)',
    'Exhaustion6': 'var(--bad-condition-background)',
    Other1: 'var(--neutral-condition-background)',
    Other2: 'var(--neutral-condition-background)',
    Other3: 'var(--neutral-condition-background)',
    Other4: 'var(--neutral-condition-background)',
    '(Custom)': 'var(--neutral-condition-background)',
  });

  const [conditionDescriptions, setConditionDescriptions] = useState(JSON.parse(localStorage.getItem("condition-descriptions")) ?? {
    Blinded: "ΓÇó CanΓÇÖt See. You canΓÇÖt see and automatically fail any ability check that requires sight. ???ΓÇó Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.",
    Charmed: "ΓÇó CanΓÇÖt Harm the Charmer. You canΓÇÖt attack the charmer or target the charmer with damaging abilities or magical effects.???ΓÇó Social Advantage. The charmer has Advantage on any ability check to interact with you socially.",
    Deafened: "ΓÇó CanΓÇÖt Hear. You canΓÇÖt hear and automatically fail any ability check that requires hearing.",
    Frightened: "ΓÇó Ability Checks and Attacks Affected. You have Disadvantage on ability checks and attack rolls while the source of fear is within line of sight.???ΓÇó CanΓÇÖt Approach. You canΓÇÖt willingly move closer to the source of fear.",
    Grappled: "ΓÇó Speed 0. Your Speed is 0 and canΓÇÖt increase.???ΓÇó Attacks Affected. You have Disadvantage on attack rolls against any target other than the grappler.???ΓÇó Movable. The grappler can drag or carry you when it moves, but every foot of movement costs it 1 extra foot unless you are Tiny or two or more sizes smaller than it.",
    Incapacitated: "ΓÇó Inactive. You canΓÇÖt take any action, Bonus Action, or Reaction.???ΓÇó No Concentration. Your Concentration is broken.???ΓÇó Speechless. You canΓÇÖt speak.???ΓÇó Surprised. If youΓÇÖre Incapacitated when you roll Initiative, you have Disadvantage on the roll.",
    Invisible: "ΓÇó Surprise. If youΓÇÖre Invisible when you roll Initiative, you have Advantage on the roll.???ΓÇó Concealed. You arenΓÇÖt affected by any effect that requires its target to be seen unless the effectΓÇÖs creator can somehow see you. Any equipment you are wearing or carrying is also concealed.???ΓÇó Attacks Affected. Attack rolls against you have Disadvantage, and your attack rolls have Advantage. If a creature can somehow see you, you donΓÇÖt gain this benefit against that creature.",
    Paralyzed: "ΓÇó Incapacitated. You have the Incapacitated condition.???ΓÇó Speed 0. Your Speed is 0 and canΓÇÖt increase.???ΓÇó Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???ΓÇó Attacks Affected. Attack rolls against you have Advantage.???ΓÇó Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.",
    Petrified: "ΓÇó Turned to Inanimate Substance. You are transformed, along with any nonmagical objects you are wearing and carrying, into a solid inanimate substance (usually stone). Your weight increases by a factor of ten, and you cease aging.???ΓÇó Incapacitated. You have the Incapacitated condition.???ΓÇó Speed 0. Your Speed is 0 and canΓÇÖt increase.???ΓÇó Attacks Affected. Attack rolls against you have Advantage.???ΓÇó Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???ΓÇó Resist Damage. You have Resistance to all damage.???ΓÇó Poison Immunity. You have Immunity to the Poisoned condition.",
    Poisoned: "ΓÇó Ability Checks and Attacks Affected. You have Disadvantage on attack rolls and ability checks.",
    Prone: "ΓÇó Restricted Movement. Your only movement options are to crawl or to spend an amount of movement equal to half your Speed (round down) to right yourself and thereby end the condition. If your Speed is 0, you canΓÇÖt right yourself.???ΓÇó Attacks Affected. You have Disadvantage on attack rolls. An attack roll against you has Advantage if the attacker is within 5 feet of you. Otherwise, that attack roll has Disadvantage.",
    Restrained: "ΓÇó Speed 0. Your Speed is 0 and canΓÇÖt increase.???ΓÇó Attacks Affected. Attack rolls against you have Advantage, and your attack rolls have Disadvantage.???ΓÇó Saving Throws Affected. You have Disadvantage on Dexterity saving throws.",
    Stunned: "ΓÇó Incapacitated. You have the Incapacitated condition.???ΓÇó Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???ΓÇó Attacks Affected. Attack rolls against you have Advantage.",
    Unconscious: "ΓÇó Inert. You have the Incapacitated and Prone conditions, and you drop whatever youΓÇÖre holding. When this condition ends, you remain Prone.???ΓÇó Speed 0. Your Speed is 0 and canΓÇÖt increase.???ΓÇó Attacks Affected. Attack rolls against you have Advantage.???ΓÇó Saving Throws Affected. You automatically fail Strength and Dexterity saving throws.???ΓÇó Automatic Critical Hits. Any attack roll that hits you is a Critical Hit if the attacker is within 5 feet of you.???ΓÇó Unaware. YouΓÇÖre unaware of your surroundings.",
    Exhaustion1: "ΓÇó D20 Tests Affected. When you make a D20 Test, the roll is reduced by 2.???ΓÇó Speed Reduced. Your Speed is reduced by 5 feet.???ΓÇó Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
    Exhaustion2: "ΓÇó D20 Tests Affected. When you make a D20 Test, the roll is reduced by 4.???ΓÇó Speed Reduced. Your Speed is reduced by 10 feet.???ΓÇó Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
    Exhaustion3: "ΓÇó D20 Tests Affected. When you make a D20 Test, the roll is reduced by 6.???ΓÇó Speed Reduced. Your Speed is reduced by 15 feet.???ΓÇó Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
    Exhaustion4: "ΓÇó D20 Tests Affected. When you make a D20 Test, the roll is reduced by 8.???ΓÇó Speed Reduced. Your Speed is reduced by 20 feet.???ΓÇó Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
    Exhaustion5: "ΓÇó D20 Tests Affected. When you make a D20 Test, the roll is reduced by 10.???ΓÇó Speed Reduced. Your Speed is reduced by 25 feet.???ΓÇó Removing Exhaustion Levels. Finishing a Long Rest removes 1 of your Exhaustion levels. When your Exhaustion level reaches 0, the condition ends.",
    Exhaustion6: "ΓÇó You are Dead.???ΓÇó If you are revived after dying this way, you return to life with Exhaustion5.",
    "(Custom)": "Filler description for custom condition.",
  });
  
  const [sortedRowData, setSortedRowData] = useState([]);

  const [openMenuIndex, setOpenMenuIndex] = useState(null);

  const [deleteConfirmIndex, setDeleteConfirmIndex] = useState(null);

  const [editCharacterIndex, setEditCharacterIndex] = useState(null);

  const [viewCharacterIndex, setViewCharacterIndex] = useState(null);
  const [viewedSummon, setViewedSummon] = useState(null);

  const [expirationTiming, setExpirationTiming] = useState("unknown");
  const [expirationType, setExpirationType] = useState("");
  const [expirationTarget, setExpirationTarget] = useState("");
  const [expirationRound, setExpirationRound] = useState("");

  const [isCustomConditionModalOpen, setIsCustomConditionModalOpen] = useState(false);

  const [selectedConditions, setSelectedConditions] = useState([]);
  const [selectedCharacters, setSelectedCharacters] = useState([]);
  const [mobileAddConditionStep, setMobileAddConditionStep] = useState(1);

  const [showCustomConditionForm, setShowCustomConditionForm] = useState(false);
  const [customConditionName, setCustomConditionName] = useState('');
  const [customConditionAffect, setCustomConditionAffect] = useState('');
  const [customConditionDescription, setCustomConditionDescription] = useState('');
  const [pendingCustomConditionDelete, setPendingCustomConditionDelete] = useState(null);
  const [isCustomConditionMultiDeleteMode, setIsCustomConditionMultiDeleteMode] = useState(false);
  const [multiDeleteCustomConditionIndexes, setMultiDeleteCustomConditionIndexes] = useState([]);

  const [editCustomConditionIndex, setEditCustomConditionIndex] = useState(null);

  const [toggleAddConditionEnforcementMessage, setToggleAddConditionEnforcementMessage] = useState(false);

  const [mobCustomOpen, setMobCustomOpen] = useState(false);
  const guidedTutorialSteps = [
    (
      <>
        Welcome to the guided tutorial!
        <br /><br />
        Let&apos;s walk through some of the great features you&apos;ll find in our Initiative Tracker.
        <br /><br />
        Click &quot;Next&quot; to continue the tutorial. You can click on the &quot;X&quot; in the top right corner to end the
        tutorial at any time.
      </>
    ),
    (
      <>
        This icon is how you add a new character to the initiative list.
        <br /><br />
        This will open a screen where you can input your character name and their affiliation (Player Character,
        Enemy, Ally, or Neutral/Environmental).
      </>
    ),
    (
      <>
        When a character is created, you&apos;ll see several new text boxes and icons. Each of these is identified by
        the headers at the top (Initiative, Edit, Delete, etc).
      </>
    ),
    (
      <>
        The text box in the &quot;Inititiave&quot; column is where you&apos;ll input the initiative value of this character. <br /><br />
        As you input the numbers, the characters will automatically reorder so the highest value initiative is at the
        top. If there is a tie, then it will go alphabetically by character name.
      </>
    ),
    (
      <>
        The feather quill icon is how you can edit the character&apos;s name or affiliation after they&apos;ve been created.
        <br /><br />
        The circled x icon is how you can delete a character. If you click this, a warning will pop up to make sure
        you want to delete the character because that action cannot be undone.
      </>
    ),
    (
      <>
        The text box in the &quot;AC&quot; column is where you can type in the armor class of the character.<br /><br />
        Likewise, the text box in the &quot;HP&quot; column is where you can type in the hit points of the character.
        <br /><br />
        These columns are optional and the visiblity of them can be toggled on or off within the settings
        (discussed later).
      </>
    ),
    (
      <>
        The &quot;Name&quot; column will display the character name after you&apos;ve entered it. If you added any minions or summons, those will
        appear beneath the character's name.
        <br /><br />
        The &quot;Conditions&quot; column will display any conditions you&apos;ve added to the character (discussed later).
        <br /><br />
        You can click on the name of the character or any condition in the conditions column and that will open the
        condition view on the right for that character.
      </>
    ),
    (
      <>
        The gear icon will open the settings menu.
        <br /><br />
        At the top of this menu, you&apos;ll see the previously mentioned toggles to turn on or off the visibility of
        the AC and HP columns.
        <br /><br />
        Beneath that, you&apos;ll see the &quot;Initiative Cleanup&quot; section. In this section you can click buttons or check
        boxes to remove things from the initiative list in bulk, such as when you&apos;re headed into a new combat. All
        of these clean up items are irreversible after the &quot;Submit&quot; button is pressed.
      </>
    ),
    (
      <>
        The left and right pointing arrows are how you progress through initiative. <br/ ><br/ > 
        Clicking the right arrow will take the current character at the top of the list and move them to the bottom of the list
        while also moving the character in the second spot up to the top and so forth. Clicking the left arrow will do the opposite.  
        <br/ ><br/ >  This will always keep the active player at the top of the list, while also being able to see who is up next. 
        
      </>
    ),
    (
      <>
        This droplet with a plus icon is where you can add conditions to the characters. This will open a new
        window where you can multi-select who the condition applies to, which conditions are applied, and when
        those conditions will expire.
        <br /><br />
        When you click the &quot;(Custom)&quot; condition, a side panel opens where you can add your own conditions with a
        name, description, and if the condition is positive, negative, or neutral.
      </>
    ),
    (
      <>
        After a condition has been applied, the name and full description will show on the right side, in the
        &quot;Conditions&quot; area while just the name will appear in the Initiative List, next to the name of the character
        who holds that condition.
        <br/><br/>
        You can click on the circle X to the left of the condition's name to remove that condition from the character. 
      </>
    )
  ];

  // Restore own tracker state saved before joining a session (runs before auto-join)
  useEffect(() => {
    const saved = localStorage.getItem('initiative_own_data');
    if (!saved) return;
    try {
      const own = JSON.parse(saved);
      setRowData(own.rowData ?? []);
      setRound(own.round ?? 1);
      if (own.rowVisibility) setRowVisibility(own.rowVisibility);
      if (own.overlayActive) setOverlayActive(own.overlayActive);
      if (own.shiftedRowIndex !== undefined) setShiftedRowIndex(own.shiftedRowIndex);
    } catch {}
    localStorage.removeItem('initiative_own_data');
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-reconnect as host (from localStorage) or auto-join as joiner (from URL) on mount
  useEffect(() => {
    const savedHostCode = localStorage.getItem('session_hosting_code');
    if (savedHostCode) {
      getSession(savedHostCode).then(result => {
        if (!result) {
          localStorage.removeItem('session_hosting_code');
          return;
        }
        const { data } = result;
        isSyncingFromWs.current = true;
        setRowData(data.rowData);
        setRound(data.round);
        if (data.rowVisibility) setRowVisibility(data.rowVisibility);
        if (data.overlayActive) setOverlayActive(data.overlayActive);
        if (data.shiftedRowIndex !== undefined) setShiftedRowIndex(data.shiftedRowIndex);
        setActiveSessionCode(savedHostCode);
        setSessionMode('hosting');
        openSessionWebSocket(savedHostCode, 'host');
      }).catch(() => {
        localStorage.removeItem('session_hosting_code');
      });
      return;
    }

    const sessionCode = new URLSearchParams(window.location.search).get('session');
    if (!sessionCode || sessionCode.length !== 6) return;
    const code = sessionCode.toUpperCase();
    getSession(code).then(result => {
      if (!result) return;
      const { data } = result;
      localStorage.setItem('initiative_own_data', JSON.stringify({ rowData, round, rowVisibility, overlayActive, shiftedRowIndex }));
      isSyncingFromWs.current = true;
      setRowData(data.rowData);
      setRound(data.round);
      if (data.rowVisibility) setRowVisibility(data.rowVisibility);
      if (data.overlayActive) setOverlayActive(data.overlayActive);
      if (data.shiftedRowIndex !== undefined) setShiftedRowIndex(data.shiftedRowIndex);
      setActiveSessionCode(code);
      setSessionMode('joining');
      openSessionWebSocket(code);
    }).catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync initiative state changes to the active session via WebSocket
  useEffect(() => {
    if (isSyncingFromWs.current) {
      isSyncingFromWs.current = false;
      return;
    }
    if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN || !activeSessionCode) return;
    wsRef.current.send(JSON.stringify({
      type: 'update',
      data: { rowData, round, rowVisibility, overlayActive, shiftedRowIndex },
    }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rowData, round, rowVisibility, overlayActive, shiftedRowIndex]);

  // Clean up WebSocket and timers on unmount
  useEffect(() => {
    return () => {
      if (wsRef.current) wsRef.current.close();
      clearTimeout(hostDisconnectTimerRef.current);
    };
  }, []);

  useEffect(() => {
    setIsSettingsModalOpen(isGuidedTutorialModalOpen && guidedTutorialStep === 8);
  }, [isGuidedTutorialModalOpen, guidedTutorialStep]);

  useEffect(() => {
    const isStep10 = isGuidedTutorialModalOpen && guidedTutorialStep === 10;
    setIsAddConditionModalOpen(isStep10 ? 0 : null);
    setIsCustomConditionModalOpen(isStep10);
  }, [isGuidedTutorialModalOpen, guidedTutorialStep]);

  useEffect(() => {
    const isHighlightStep = guidedTutorialStep >= 2 && guidedTutorialStep <= 10;
    if (!isGuidedTutorialModalOpen) {
      setGuidedTutorialSpotlights([]);
      return;
    }

    if (guidedTutorialStep === 3) {
      const hasCharacter = rowData.some((row) => row.name && row.name.trim() !== '');
      if (!hasCharacter) {
        setRowData((prev) => {
          if (prev.some((row) => row.name && row.name.trim() !== '')) {
            return prev;
          }
          const updated = [...prev];
          updated[0] = {
            ...updated[0],
            name: 'Tutoritus the Guide',
            affiliation: 'Ally',
            conditions: [{ name: 'Invisible', expiration: 'Expires NA / Unknown' }]
          };
          return updated;
        });
        setOverlayActive((prev) => {
          if (!prev || prev.length === 0) return prev;
          const updated = [...prev];
          updated[0] = false;
          if (updated.length > 1) {
            updated[1] = true;
          }
          return updated;
        });
        setRowVisibility((prev) => {
          if (!prev || prev.length === 0) return prev;
          const updated = [...prev];
          updated[0] = true;
          if (updated.length > 1) {
            updated[1] = true;
          }
          return updated;
        });
      }
    }

    if (guidedTutorialStep === 11) {
      const firstVisibleIndex = sortedRowData.findIndex((row) => !overlayActive[row.index]);
      if (firstVisibleIndex >= 0 && shiftedRowIndex !== firstVisibleIndex) {
        setShiftedRowIndex(firstVisibleIndex);
      }

      if (firstVisibleIndex >= 0) {
        const rowIndex = sortedRowData[firstVisibleIndex]?.index;
        if (rowIndex !== undefined) {
          setRowData((prev) => {
            const updated = [...prev];
            const existing = updated[rowIndex]?.conditions || [];
            const hasOther1 = existing.some((c) => (typeof c === 'object' ? c.name === 'Other1' : c === 'Other1'));
            if (hasOther1) return prev;
            updated[rowIndex] = {
              ...updated[rowIndex],
              conditions: [...existing, { name: 'Other1', expiration: 'Expires NA / Unknown' }]
            };
            return updated;
          });
        }
      }

      const firstConditionDescription = document.querySelector('.conditions-list .conditions-row .condition-description');
      const rows = document.querySelectorAll('.initiative-list-content .row');
      const targetRow = firstVisibleIndex >= 0 ? rows[firstVisibleIndex] : null;
      const personalConditions = targetRow?.querySelector('.personal-conditions');

      if (!firstConditionDescription && !personalConditions) {
        setGuidedTutorialSpotlights([]);
        return;
      }

      const padding = 6;
      const spots = [];

      if (firstConditionDescription) {
        const rect = firstConditionDescription.getBoundingClientRect();
        spots.push({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          shape: 'rect'
        });
      }

      if (personalConditions) {
        const rect = personalConditions.getBoundingClientRect();
        spots.push({
          x: rect.left + rect.width / 2,
          y: rect.top + rect.height / 2,
          width: rect.width + padding * 2,
          height: rect.height + padding * 2,
          shape: 'rect'
        });
      }

      setGuidedTutorialSpotlights(spots);
      return;
    }

    if (!isHighlightStep) {
      setGuidedTutorialSpotlights([]);
      return;
    }

    const updateSpotlight = () => {
      if (guidedTutorialStep === 2) {
        const targetButton = document.querySelector('.add-character-button');
        if (!targetButton) {
          setGuidedTutorialSpotlights([]);
          return;
        }

        const updateFromRect = () => {
          const rect = targetButton.getBoundingClientRect();
          const size = Math.max(rect.width, rect.height) * 0.1;
          setGuidedTutorialSpotlights([
            {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              width: size,
              height: size,
              shape: 'circle'
            }
          ]);
        };

        const scrollContainer = document.querySelector('.initiative-list-content');
        if (scrollContainer) {
          const containerRect = scrollContainer.getBoundingClientRect();
          const buttonRect = targetButton.getBoundingClientRect();
          const isVisible =
            buttonRect.top >= containerRect.top &&
            buttonRect.bottom <= containerRect.bottom;

          if (!isVisible) {
            targetButton.scrollIntoView({ block: 'center', inline: 'nearest' });
            requestAnimationFrame(updateFromRect);
            return;
          }
        }

        updateFromRect();
        return;
      }

      if (guidedTutorialStep === 3) {
        const headerRow = document.querySelector('.initiative-list-column-headers');
        if (!headerRow) {
          setGuidedTutorialSpotlights([]);
          return;
        }

        const rect = headerRow.getBoundingClientRect();
        const padding = 6;
        setGuidedTutorialSpotlights([
          {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            shape: 'rect'
          }
        ]);
        return;
      }

      if (guidedTutorialStep === 4) {
        const firstVisibleIndex = sortedRowData.findIndex((row) => !overlayActive[row.index]);
        const rows = document.querySelectorAll('.initiative-list-content .row');
        const targetRow = firstVisibleIndex >= 0 ? rows[firstVisibleIndex] : null;
        const targetInput = targetRow?.querySelector('.initiative-input .initiative-textbox');

        if (!targetInput) {
          setGuidedTutorialSpotlights([]);
          return;
        }

        const rect = targetInput.getBoundingClientRect();
        const padding = 6;
        setGuidedTutorialSpotlights([
          {
            x: rect.left + rect.width / 2,
            y: rect.top + rect.height / 2,
            width: rect.width + padding * 2,
            height: rect.height + padding * 2,
            shape: 'rect'
          }
        ]);
        return;
      }

      if (guidedTutorialStep === 5) {
        const firstVisibleIndex = sortedRowData.findIndex((row) => !overlayActive[row.index]);
        const rows = document.querySelectorAll('.initiative-list-content .row');
        const targetRow = firstVisibleIndex >= 0 ? rows[firstVisibleIndex] : null;
        const icons = targetRow
          ? Array.from(targetRow.querySelectorAll('.edit-icon, .delete-icon'))
          : [];

        if (icons.length === 0) {
          setGuidedTutorialSpotlights([]);
          return;
        }

        const rects = icons.map((icon) => icon.getBoundingClientRect());
        const minLeft = Math.min(...rects.map((r) => r.left));
        const maxRight = Math.max(...rects.map((r) => r.right));
        const minTop = Math.min(...rects.map((r) => r.top));
        const maxBottom = Math.max(...rects.map((r) => r.bottom));
        const padding = 8;
        const width = maxRight - minLeft + padding * 2;
        const height = maxBottom - minTop + padding * 2;

        setGuidedTutorialSpotlights([
          {
            x: minLeft + (maxRight - minLeft) / 2,
            y: minTop + (maxBottom - minTop) / 2,
            width,
            height,
            shape: 'circle'
          }
        ]);
        return;
      }

      if (guidedTutorialStep === 6) {
        const firstVisibleIndex = sortedRowData.findIndex((row) => !overlayActive[row.index]);
        const rows = document.querySelectorAll('.initiative-list-content .row');
        const targetRow = firstVisibleIndex >= 0 ? rows[firstVisibleIndex] : null;
        const acInput = targetRow?.querySelector('.ac-input .initiative-textbox');
        const hpInput = targetRow?.querySelector('.hp-input .initiative-textbox');

        if (!acInput || !hpInput) {
          setGuidedTutorialSpotlights([]);
          return;
        }

        const acRect = acInput.getBoundingClientRect();
        const hpRect = hpInput.getBoundingClientRect();
        const minLeft = Math.min(acRect.left, hpRect.left);
        const maxRight = Math.max(acRect.right, hpRect.right);
        const minTop = Math.min(acRect.top, hpRect.top);
        const maxBottom = Math.max(acRect.bottom, hpRect.bottom);
        const padding = 6;

        setGuidedTutorialSpotlights([
          {
            x: minLeft + (maxRight - minLeft) / 2,
            y: minTop + (maxBottom - minTop) / 2,
            width: maxRight - minLeft + padding * 2,
            height: maxBottom - minTop + padding * 2,
            shape: 'rect'
          }
        ]);
        return;
      }

      if (guidedTutorialStep === 7) {
        const firstVisibleIndex = sortedRowData.findIndex((row) => !overlayActive[row.index]);
        const rows = document.querySelectorAll('.initiative-list-content .row');
        const targetRow = firstVisibleIndex >= 0 ? rows[firstVisibleIndex] : null;
        const nameCell = targetRow?.querySelector('.name-input');
        const conditionsCell = targetRow?.querySelector('.personal-conditions');

        if (!nameCell || !conditionsCell) {
          setGuidedTutorialSpotlights([]);
          return;
        }

        const nameRect = nameCell.getBoundingClientRect();
        const conditionsRect = conditionsCell.getBoundingClientRect();
        const minLeft = Math.min(nameRect.left, conditionsRect.left);
        const maxRight = Math.max(nameRect.right, conditionsRect.right);
        const minTop = Math.min(nameRect.top, conditionsRect.top);
        const maxBottom = Math.max(nameRect.bottom, conditionsRect.bottom);
        const padding = 6;

        setGuidedTutorialSpotlights([
          {
            x: minLeft + (maxRight - minLeft) / 2,
            y: minTop + (maxBottom - minTop) / 2,
            width: maxRight - minLeft + padding * 2,
            height: maxBottom - minTop + padding * 2,
            shape: 'rect'
          }
        ]);
        return;
      }

      if (guidedTutorialStep === 8) {
        setGuidedTutorialSpotlights([]);
        return;
      }

      if (guidedTutorialStep === 9) {
        const banner = document.querySelector('.initiative-banner');
        const backButton = banner?.querySelector('.back-button');
        const nextButton = banner?.querySelector('.next-button');

        if (!backButton || !nextButton) {
          setGuidedTutorialSpotlights([]);
          return;
        }

        const backRect = backButton.getBoundingClientRect();
        const nextRect = nextButton.getBoundingClientRect();
        const minLeft = Math.min(backRect.left, nextRect.left);
        const maxRight = Math.max(backRect.right, nextRect.right);
        const minTop = Math.min(backRect.top, nextRect.top);
        const maxBottom = Math.max(backRect.bottom, nextRect.bottom);
        const padding = 10;

        setGuidedTutorialSpotlights([
          {
            x: minLeft + (maxRight - minLeft) / 2,
            y: minTop + (maxBottom - minTop) / 2 + 5,
            width: maxRight - minLeft + padding * 2,
            height: maxBottom - minTop + padding * 2,
            shape: 'circle'
          }
        ]);
        return;
      }

      if (guidedTutorialStep === 10) {
        setGuidedTutorialSpotlights([]);
        return;
      }
    };

    updateSpotlight();
    window.addEventListener('resize', updateSpotlight);
    window.addEventListener('scroll', updateSpotlight, true);

    return () => {
      window.removeEventListener('resize', updateSpotlight);
      window.removeEventListener('scroll', updateSpotlight, true);
    };
  }, [isGuidedTutorialModalOpen, guidedTutorialStep, rowData, rowVisibility, overlayActive, sortedRowData]);

  useEffect(() => {
    const handleOpenTutorial = () => {
      const initiativeScrollContainer = document.querySelector('.initiative-page-scroll');
      if (initiativeScrollContainer) {
        initiativeScrollContainer.scrollTop = 0;
      }

      window.scrollTo({ top: 0, behavior: 'auto' });

      setIsTutorialModalOpen(false);
      setIsGuidedTutorialModalOpen(true);
      setGuidedTutorialStep(1);
    };

    window.addEventListener('open-initiative-tutorial', handleOpenTutorial);

    return () => {
      window.removeEventListener('open-initiative-tutorial', handleOpenTutorial);
    };
  }, []);

  useEffect(() => {
    if (isGuidedTutorialModalOpen) {
      setIsTutorialModalOpen(false);
    }
  }, [isGuidedTutorialModalOpen]);

  useEffect(() => {
    const saved = localStorage.getItem(HELP_STORAGE_KEY);
    setHelpHidden(saved === "true");
  }, []);

  useEffect(() => {
    const description =
      "Free D&D 5e initiative tracker for DMs and players. Track turn order, rounds, conditions, and concentration fast with no login required.";
    const title = "Initiative Tracker | Site of Many Things";
    const image = "https://thesiteofmanythings.com/images/initiative-preview.png";

    document.title = title;
    setMetaDescription(description);
    setCanonical("https://thesiteofmanythings.com/initiative");

    let metaDescription = document.querySelector('meta[name="description"]');
    let metaOgTitle = document.querySelector('meta[property="og:title"]');
		let metaOgDescription = document.querySelector('meta[property="og:description"]');
		let metaOgImage = document.querySelector('meta[property="og:image"]');

    if (!metaDescription) {
      metaDescription = document.createElement('meta');
      metaDescription.setAttribute('name', 'description');
      document.head.appendChild(metaDescription);
    }
    metaDescription.setAttribute('content', description);

    if (!metaOgTitle) {
      metaOgTitle = document.createElement('meta');
      metaOgTitle.setAttribute('property', 'og:title');
      document.head.appendChild(metaOgTitle);
    }
    metaOgTitle.setAttribute('content', title);

    if (!metaOgDescription) {
      metaOgDescription = document.createElement('meta');
      metaOgDescription.setAttribute('property', 'og:description');
      document.head.appendChild(metaOgDescription);
    }
    metaOgDescription.setAttribute('content', description);

    if (!metaOgImage) {
      metaOgImage = document.createElement('meta');
      metaOgImage.setAttribute('property', 'og:image');
      document.head.appendChild(metaOgImage);
    }
    metaOgImage.setAttribute('content', image);

    const existingJsonLd = document.getElementById('initiative-tracker-jsonld');
    if (existingJsonLd) {
      existingJsonLd.remove();
    }

    const jsonLd = {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "Free D&D 5e Initiative Tracker",
      applicationCategory: "GameApplication",
      operatingSystem: "Web",
      description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD"
      }
    };

    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'initiative-tracker-jsonld';
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const resetSettingsCheckboxes = () => {
    setResetRound(false);
    setResetInitiative(false);
    setRemoveAllConditions(false);
    setRemoveNeutral(false);
    setRemoveEnemies(false);
    setRemoveAllies(false);
    setRemovePlayers(false);
    setFillCharacters(false);
  };

  const handleNewCombat = () => {
    let updatedData = [...rowData];
    let updatedVisibility = [...rowVisibility];
    let updatedOverlay = [...overlayActive];

    for (let i = updatedData.length - 1; i >= 0; i--) {
      const aff = updatedData[i].affiliation;
      if (aff === 'Enemy' || aff === 'Neutral/Environmental') {
        updatedData.splice(i, 1);
        updatedVisibility.splice(i, 1);
        updatedOverlay.splice(i, 1);
      }
    }

    updatedData = updatedData.map(row => ({
      ...row,
      initiative: null
    }));

    while (updatedData.length < 30) {
      updatedData.push({ name: '', affiliation: '', initiative: null, conditions: [] });
      updatedVisibility.push(
        updatedData.length === 1
          ? true
          : updatedData[updatedData.length - 2].name !== ''
          ? true
          : false
      );
      updatedOverlay.push(
        updatedData.length === 1
          ? true
          : updatedData[updatedData.length - 2].name !== ''
          ? true
          : false
      );
    }

    setRowData(updatedData);
    setRowVisibility(updatedVisibility);
    setOverlayActive(updatedOverlay);
    setRound(1);
    setShiftedRowIndex(null);
    setViewCharacterIndex(null);
    resetSettingsCheckboxes();
    setIsSettingsModalOpen(false); // Close the modal
  };

  const handleFillCharacters = () => {
    let updatedData = [...rowData];
    let updatedVisibility = [];
    let updatedOverlay = [];

    let latestIndex = 0;
    for (let i = 0; i < updatedData.length - 1; i++) {
      if (updatedData[i].name === '') {
        latestIndex = i;
        break;
      }
    }

    updatedData.splice(latestIndex);

    let fillAmount = 30 - latestIndex;
    let charAmount = Math.floor(fillAmount / 4)
    let playerAmount = charAmount + (fillAmount % 4);
    
    for (let i = 0; i < playerAmount; i++) {
      updatedData.push({ name: `Player ${i + 1}`, affiliation: 'Player Character', initiative: null, conditions: getRandomConditions() });
    }

    for (let i = 0; i < charAmount; i++) {
      updatedData.push({ name: `Enemy ${i + 1}`, affiliation: 'Enemy', initiative: null, conditions: getRandomConditions() });
      updatedData.push({ name: `Ally ${i + 1}`, affiliation: 'Ally', initiative: null, conditions: getRandomConditions() });
      updatedData.push({ name: `Neutral ${i + 1}`, affiliation: 'Neutral/Environmental', initiative: null, conditions: getRandomConditions() });
    }

    for (let i = 0; i < 30; i++) {
      updatedVisibility.push(true);
      updatedOverlay.push(false);
    }

    setRowVisibility(updatedVisibility);
    setOverlayActive(updatedOverlay);
    setRowData(updatedData);
    setShiftedRowIndex(null);
    setViewCharacterIndex(null);
    resetSettingsCheckboxes();
    setIsSettingsModalOpen(false);
  }

  const getRandomConditions = () => {
    const goodConditions = {};
    const badConditions = {};
    const neutralConditions = {};

    for (let key in conditionColors) {
      if (conditionColors[key].includes('good')) goodConditions[key] = conditionColors[key];
      if (conditionColors[key].includes('bad')) badConditions[key] = conditionColors[key];
      if (conditionColors[key].includes('neutral')) neutralConditions[key] = conditionColors[key];
    }

    delete neutralConditions['(Custom)'];

    const goodConditionKeys = Object.keys(goodConditions);
    const badConditionKeys = Object.keys(badConditions);
    const neutralConditionKeys = Object.keys(neutralConditions);

    return [
      { name: goodConditionKeys[Math.floor(Math.random() * goodConditionKeys.length)]
        ,expiration: 'Expires NA / Unknown'
      },
      { name: badConditionKeys[Math.floor(Math.random() * badConditionKeys.length)]
        ,expiration: 'Expires NA / Unknown'
      },
      { name: neutralConditionKeys[Math.floor(Math.random() * neutralConditionKeys.length)]
        ,expiration: 'Expires NA / Unknown'
      }
    ];
  }

  const getOriginalAndCustomConditions = () => {
    const original = [
      'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated',
      'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained',
      'Stunned', 'Unconscious', 'Exhaustion1', 'Exhaustion2', 'Exhaustion3',
      'Exhaustion4', 'Exhaustion5', 'Exhaustion6', 'Other1', 'Other2', 'Other3', 'Other4'
    ];
    const custom = customConditions.map(cond => cond.name);
    return [...original, ...custom].sort((a, b) => a.localeCompare(b));
  }

  const handleAddConditionClick = (rowIndex) => {
    setIsAddConditionModalOpen(rowIndex);
    setMobileAddConditionStep(1);
  };

  const handleFullReset = () => {
    setRowData(
      Array(30).fill({ name: '', affiliation: '', initiative: null, conditions: [] })
    );
    setRowVisibility(Array(30).fill(false).map((_, idx) => idx === 0));
    setOverlayActive(Array(30).fill(false).map((_, idx) => idx === 0));
    setRound(1);
    setShiftedRowIndex(null);
    setViewCharacterIndex(null);
    setIsSettingsModalOpen(false);
  };

  const openSessionWebSocket = (code, role = 'joiner') => {
    if (wsRef.current) wsRef.current.close();
    const ws = new WebSocket(sessionWsUrl(code, role));
    wsRef.current = ws;

    let heartbeatInterval = null;
    if (role === 'host') {
      ws.onopen = () => {
        heartbeatInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ping' }));
          }
        }, 5000);
      };
    }

    ws.onmessage = (event) => {
      if (wsRef.current !== ws) return;
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'sync' || msg.type === 'update') {
          const data = msg.data;
          isSyncingFromWs.current = true;
          setRowData(data.rowData);
          setRound(data.round);
          if (data.rowVisibility) setRowVisibility(data.rowVisibility);
          if (data.overlayActive) setOverlayActive(data.overlayActive);
          if (data.shiftedRowIndex !== undefined) setShiftedRowIndex(data.shiftedRowIndex);
        } else if (msg.type === 'session_ended') {
          clearTimeout(hostDisconnectTimerRef.current);
          hostDisconnectTimerRef.current = null;
          setHostTemporarilyDisconnected(false);
          wsRef.current = null;
          setSessionEnded(true);
        } else if (msg.type === 'host_disconnected') {
          setHostTemporarilyDisconnected(true);
          clearTimeout(hostDisconnectTimerRef.current);
          hostDisconnectTimerRef.current = setTimeout(() => {
            setHostTemporarilyDisconnected(false);
            wsRef.current = null;
            setSessionEnded(true);
          }, 60000);
        } else if (msg.type === 'host_reconnected') {
          clearTimeout(hostDisconnectTimerRef.current);
          hostDisconnectTimerRef.current = null;
          setHostTemporarilyDisconnected(false);
        }
      } catch {}
    };
    ws.onerror = () => {};
    ws.onclose = () => {
      if (heartbeatInterval) clearInterval(heartbeatInterval);
    };
  };

  const handleHostSession = async () => {
    setIsSessionLoading(true);
    setHostError('');
    try {
      const { code } = await createSession({ rowData, round, rowVisibility, overlayActive, shiftedRowIndex });
      setActiveSessionCode(code);
      setSessionMode('hosting');
      localStorage.setItem('session_hosting_code', code);
      openSessionWebSocket(code, 'host');
    } catch {
      setHostError('Could not connect. Please try again.');
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleJoinSession = async () => {
    const code = joinCodeInput.trim().toUpperCase();
    if (code.length !== 6) {
      setJoinError('Please enter a 6-character code.');
      return;
    }
    setIsSessionLoading(true);
    setJoinError('');
    try {
      const result = await getSession(code);
      if (!result) {
        setJoinError('Session Not Found. Try Again.');
        return;
      }
      const { data } = result;
      localStorage.setItem('initiative_own_data', JSON.stringify({ rowData, round, rowVisibility, overlayActive, shiftedRowIndex }));
      isSyncingFromWs.current = true;
      setRowData(data.rowData);
      setRound(data.round);
      if (data.rowVisibility) setRowVisibility(data.rowVisibility);
      if (data.overlayActive) setOverlayActive(data.overlayActive);
      if (data.shiftedRowIndex !== undefined) setShiftedRowIndex(data.shiftedRowIndex);
      setActiveSessionCode(code);
      setSessionMode('joining');
      openSessionWebSocket(code);
    } catch {
      setJoinError('Session Not Found. Try Again.');
    } finally {
      setIsSessionLoading(false);
    }
  };

  const handleShareSession = async () => {
    const link = `${window.location.origin}/initiative?session=${activeSessionCode}`;
    try {
      await navigator.clipboard.writeText(link);
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2000);
    } catch {
      window.prompt('Copy this link to share:', link);
    }
  };

  const handleEndSession = () => {
    localStorage.removeItem('session_hosting_code');
    clearTimeout(hostDisconnectTimerRef.current);
    hostDisconnectTimerRef.current = null;
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({ type: 'end_session' }));
    }
    wsRef.current?.close();
    wsRef.current = null;
    setSessionMode(null);
    setActiveSessionCode('');
  };

  const handleLeaveSession = () => {
    clearTimeout(hostDisconnectTimerRef.current);
    hostDisconnectTimerRef.current = null;
    setHostTemporarilyDisconnected(false);
    wsRef.current?.close();
    wsRef.current = null;
    setSessionMode(null);
    setActiveSessionCode('');
    window.history.replaceState({}, '', window.location.pathname);
    const saved = localStorage.getItem('initiative_own_data');
    if (saved) {
      try {
        const own = JSON.parse(saved);
        isSyncingFromWs.current = true;
        setRowData(own.rowData ?? []);
        setRound(own.round ?? 1);
        if (own.rowVisibility) setRowVisibility(own.rowVisibility);
        if (own.overlayActive) setOverlayActive(own.overlayActive);
        if (own.shiftedRowIndex !== undefined) setShiftedRowIndex(own.shiftedRowIndex);
      } catch {}
      localStorage.removeItem('initiative_own_data');
    }
  };

  const handleSettingsSubmit = (e) => {
    e.preventDefault();
      const shouldResetInitiativeOrder =
        resetRound ||
        resetInitiative ||
        removeAllConditions ||
        removeNeutral ||
        removeEnemies ||
        removeAllies ||
        removePlayers ||
        fillCharacters;

      if (!isMobileLayout) {
        setShowArmorClass(viewArmorClassToggle);
        setShowHitPoints(viewHitPointsToggle);
      }
      if (resetRound) setRound(1);
      if (resetInitiative) {
        setRowData(prev =>
          prev.map(row => ({ ...row, initiative: null }))
        );
      }
      if (removeAllConditions) {
        setRowData(prev =>
          prev.map(row => ({ ...row, conditions: [] }))
        );
      }
      if (removeNeutral) {
        let filteredIndices = rowData
          .map((row, i) => row.affiliation !== 'Neutral/Environmental' ? i : null)
          .filter(i => i !== null);

        setRowData(prev => {
          let filtered = prev.filter(row => row.affiliation !== 'Neutral/Environmental');
          while (filtered.length < 30) {
            filtered.push({ name: '', affiliation: '', initiative: null, conditions: [] });
          }
          return filtered;
        });
        setRowVisibility(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length < 30) {
            filtered.push(false);
          }
          return filtered;
        });
        setOverlayActive(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length < 30) {
            filtered.push(false);
          }
          return filtered;
        });
      }
      if (removeEnemies) {
        let filteredIndices = rowData
          .map((row, i) => row.affiliation !== 'Enemy' ? i : null)
          .filter(i => i !== null);

        setRowData(prev => {
          let filtered = prev.filter(row => row.affiliation !== 'Enemy');
          while (filtered.length < 30) {
            filtered.push({ name: '', affiliation: '', initiative: null, conditions: [] });
          }
          return filtered;
        });
        setRowVisibility(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length <30) {
            filtered.push(false);
          }
          return filtered;
        });
        setOverlayActive(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length < 30) {
            filtered.push(false);
          }
          return filtered;
        });
      }
      if (removeAllies) {
        let filteredIndices = rowData
          .map((row, i) => row.affiliation !== 'Ally' ? i : null)
          .filter(i => i !== null);

        setRowData(prev => {
          let filtered = prev.filter(row => row.affiliation !== 'Ally');
          while (filtered.length < 30) {
            filtered.push({ name: '', affiliation: '', initiative: null, conditions: [] });
          }
          return filtered;
        });
        setRowVisibility(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length < 30) {
            filtered.push(false);
          }
          return filtered;
        });
        setOverlayActive(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length < 30) {
            filtered.push(false);
          }
          return filtered;
        });
      }

      if (removePlayers) {
        let filteredIndices = rowData
          .map((row, i) => row.affiliation !== 'Player Character' ? i : null)
          .filter(i => i !== null);

        setRowData(prev => {
          let filtered = prev.filter(row => row.affiliation !== 'Player Character');
          while (filtered.length < 30) {
            filtered.push({ name: '', affiliation: '', initiative: null, conditions: [] });
          }
          return filtered;
        });
        setRowVisibility(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length < 30) {
            filtered.push(false);
          }
          return filtered;
        });
        setOverlayActive(prev => {
          let filtered = filteredIndices.map(i => prev[i]);
          while (filtered.length < 30) {
            filtered.push(false);
          }
          return filtered;
        });
      }

      if (fillCharacters) handleFillCharacters();
      setIsSettingsModalOpen(false);
    resetSettingsCheckboxes();
    if (shouldResetInitiativeOrder) {
      setShiftedRowIndex(0);
    }
  }

  const handleCloseAddConditionModal = () => {
    setIsAddConditionModalOpen(null); // Close the add-condition modal
    setSelectedConditions([]);        // Deselect all conditions
    setSelectedCharacters([]);        // Deselect all characters
    setMobileAddConditionStep(1);
    setIsCustomConditionModalOpen(false);
    setToggleAddConditionEnforcementMessage(false);
  };

  const getConditionTargets = () => {
    return rowData
      .map((row, index) => ({ ...row, index }))
      .filter((row) => row.name && !overlayActive[row.index])
      .sort((a, b) => a.name.localeCompare(b.name))
      .flatMap((row) => {
        const mainTarget = {
          id: `main:${row.index}`,
          label: row.name,
          rowIndex: row.index,
          isSummon: false,
        };

        const summonTargets = (row.summons || []).map((summonName, summonIndex) => ({
          id: `summon:${row.index}:${summonIndex}`,
          label: summonName,
          rowIndex: row.index,
          parentName: row.name,
          isSummon: true,
        }));

        return [mainTarget, ...summonTargets];
      });
  };


  // Toggle selection for conditions
  const handleConditionClick = (condition) => {
    if (condition === '(Custom)') {
    const isAlreadySelected = selectedConditions.includes(condition);
    setIsCustomConditionModalOpen(!isAlreadySelected); // toggle modal open/close
    setShowCustomConditionForm(false); // always reset the form view
  }

    setSelectedConditions((prev) =>
      prev.includes(condition)
        ? prev.filter((c) => c !== condition)
        : [...prev, condition]
    );
  };

  const handleAddConditionSubmit = (e) => {
    e.preventDefault();

    const filteredSelectedConditions = selectedConditions.filter(cond => cond !== '(Custom)');

    // Enforce non-empty dropdowns and selections
    if (expirationTiming !== 'unknown') {
      if (expirationType === "round") {
        if (!expirationTarget ) {
          setToggleAddConditionEnforcementMessage(true);
          return;
        }
      } else if (expirationType === "character") {
        if (!expirationTarget || !expirationRound) {
          setToggleAddConditionEnforcementMessage(true);
          return;
        }
      } else {
        setToggleAddConditionEnforcementMessage(true);
        return;
      }
      if (filteredSelectedConditions.length < 1 || selectedCharacters.length < 1) {
        setToggleAddConditionEnforcementMessage(true);
        return;
      }
    } else {
      if (filteredSelectedConditions.length < 1 || selectedCharacters.length < 1) {
        setToggleAddConditionEnforcementMessage(true);
        return;
      }
    }

    // Build the expiration string
    let expirationString = "";

    if (expirationTiming === "unknown") {
      expirationString = "Expires NA / Unknown";
    } else if (expirationType === "round") {
      // e.g. "Expires just after Round 2"
      expirationString = `Expires ${expirationTiming} Round ${expirationTarget}`;
    } else if (expirationType === "character") {
      // e.g. "Expires just after Alice's turn on Round 2"
      expirationString = `Expires ${expirationTiming} ${expirationTarget}'s turn on Round ${expirationRound}`;
    }

    const selectedMainRows = new Set(
      selectedCharacters
        .filter((targetId) => targetId.startsWith('main:'))
        .map((targetId) => Number(targetId.split(':')[1]))
    );

    const selectedSummonTargets = selectedCharacters
      .filter((targetId) => targetId.startsWith('summon:'))
      .map((targetId) => {
        const [, rowIndexStr, summonIndexStr] = targetId.split(':');
        return {
          rowIndex: Number(rowIndexStr),
          summonIndex: Number(summonIndexStr),
        };
      });

    const updatedRows = rowData.map((row, rowIndex) => {
      let updatedRow = row;

      if (selectedMainRows.has(rowIndex)) {
        const newConditions = [
          ...row.conditions,
          ...filteredSelectedConditions
            .filter((cond) => !row.conditions.some((c) => typeof c === "object" ? c.name === cond : c === cond))
            .map((cond) => ({
              name: cond,
              expiration: expirationString,
              ...(conditionColors[cond] && { color: conditionColors[cond] }),
              ...(conditionDescriptions[cond] && { description: conditionDescriptions[cond] }),
            }))
        ];

        updatedRow = { ...updatedRow, conditions: newConditions };
      }

      const summonTargetsForRow = selectedSummonTargets.filter((target) => target.rowIndex === rowIndex);
      if (summonTargetsForRow.length > 0) {
        const existingSummonConditions = { ...(updatedRow.summonConditions || {}) };

        summonTargetsForRow.forEach(({ summonIndex }) => {
          const summonName = updatedRow.summons?.[summonIndex];
          if (!summonName) return;

          const currentSummonConditions = existingSummonConditions[summonName] || [];
          const conditionsToAdd = filteredSelectedConditions
            .filter((cond) => !currentSummonConditions.some((c) => typeof c === "object" ? c.name === cond : c === cond))
            .map((cond) => ({
              name: cond,
              expiration: expirationString,
              ...(conditionColors[cond] && { color: conditionColors[cond] }),
              ...(conditionDescriptions[cond] && { description: conditionDescriptions[cond] }),
            }));

          existingSummonConditions[summonName] = [...currentSummonConditions, ...conditionsToAdd];
        });

        updatedRow = { ...updatedRow, summonConditions: existingSummonConditions };
      }

      return updatedRow;
    });

    setRowData(updatedRows);
    setIsAddConditionModalOpen(null);
    setSelectedConditions([]);
    setSelectedCharacters([]);
    setMobileAddConditionStep(1);
    setIsCustomConditionModalOpen(false);
    setToggleAddConditionEnforcementMessage(false);
    // Optionally reset expiration dropdowns here
  };

  // const handleAddNewCustomCondition = () => {
  //   alert("Add Custom Condition clicked!");
  //   // Later, this could open a form, input, or prompt for condition name and description
  // };

  // const handleAddCustomCondition = () => {
  //   if (customConditionName.trim() !== '') {
  //     setCustomConditions([...customConditions, customConditionName.trim()]);
  //     setCustomConditionName('');
  //     setCustomConditionAffect('');
  //     setCustomConditionDescription('');
  //     setShowCustomConditionForm(false); // Hide form again
  //   }
  // };

  // Toggle selection for characters
  const handleCharacterClick = (character) => {
    setSelectedCharacters((prev) =>
      prev.includes(character)
        ? prev.filter((c) => c !== character)
        : [...prev, character]
    );
  };

  const handleMobileCharacterSelectChange = (event) => {
    const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value);
    setSelectedCharacters(selectedValues);
  };

  const handleMobileConditionSelectChange = (event) => {
    const selectedValues = Array.from(event.target.selectedOptions, (option) => option.value);
    setSelectedConditions(selectedValues);
  };

  const handleMobileConditionStepBack = () => {
    if (mobileAddConditionStep === 3) {
      setSelectedConditions([]);
      setIsCustomConditionModalOpen(false);
      setShowCustomConditionForm(false);
      setMobileAddConditionStep(2);
      return;
    }

    if (mobileAddConditionStep === 2) {
      setMobileAddConditionStep(1);
    }
  };

  const handleDeleteCustomCondition = (deleteIndex, conditionName) => {
    setCustomConditions((prevConditions) =>
      prevConditions.filter((_, i) => i !== deleteIndex)
    );
    setConditionDescriptions((prevDescriptions) => {
      const updatedDescriptions = { ...prevDescriptions };
      delete updatedDescriptions[conditionName];
      return updatedDescriptions;
    });
    setConditionColors((prevColors) => {
      const updatedColors = { ...prevColors };
      delete updatedColors[conditionName];
      return updatedColors;
    });
    setSelectedConditions((prev) => prev.filter((condition) => condition !== conditionName));
    setShowCustomConditionForm(false);
    setCustomConditionName('');
    setCustomConditionAffect('');
    setCustomConditionDescription('');
    setEditCustomConditionIndex(null);
  };

  const requestDeleteCustomCondition = (deleteIndex, conditionName) => {
    setPendingCustomConditionDelete({ index: deleteIndex, name: conditionName });
  };

  const closeCustomConditionDeletePrompt = () => {
    setPendingCustomConditionDelete(null);
  };

  const confirmSingleCustomConditionDelete = () => {
    if (!pendingCustomConditionDelete) {
      return;
    }

    handleDeleteCustomCondition(pendingCustomConditionDelete.index, pendingCustomConditionDelete.name);
    setPendingCustomConditionDelete(null);
  };

  const enterCustomConditionMultiDeleteMode = () => {
    setPendingCustomConditionDelete(null);
    setIsCustomConditionMultiDeleteMode(true);
    setMultiDeleteCustomConditionIndexes([]);
    setShowCustomConditionForm(false);
    setEditCustomConditionIndex(null);
  };

  const toggleCustomConditionMultiDeleteSelection = (conditionIndex) => {
    setMultiDeleteCustomConditionIndexes((prevIndexes) =>
      prevIndexes.includes(conditionIndex)
        ? prevIndexes.filter((index) => index !== conditionIndex)
        : [...prevIndexes, conditionIndex]
    );
  };

  const confirmMultiDeleteCustomConditions = () => {
    if (multiDeleteCustomConditionIndexes.length < 1) {
      setIsCustomConditionMultiDeleteMode(false);
      return;
    }

    const indexesToDelete = new Set(multiDeleteCustomConditionIndexes);
    const conditionNamesToDelete = customConditions
      .map((condition, index) => ({ condition, index }))
      .filter(({ index }) => indexesToDelete.has(index))
      .map(({ condition }) => condition.name);

    const namesToDeleteSet = new Set(conditionNamesToDelete);

    setCustomConditions((prevConditions) =>
      prevConditions.filter((_, index) => !indexesToDelete.has(index))
    );

    setConditionDescriptions((prevDescriptions) => {
      const updatedDescriptions = { ...prevDescriptions };
      conditionNamesToDelete.forEach((conditionName) => {
        delete updatedDescriptions[conditionName];
      });
      return updatedDescriptions;
    });

    setConditionColors((prevColors) => {
      const updatedColors = { ...prevColors };
      conditionNamesToDelete.forEach((conditionName) => {
        delete updatedColors[conditionName];
      });
      return updatedColors;
    });

    setSelectedConditions((prevSelectedConditions) =>
      prevSelectedConditions.filter((conditionName) => !namesToDeleteSet.has(conditionName))
    );

    setIsCustomConditionMultiDeleteMode(false);
    setMultiDeleteCustomConditionIndexes([]);
    setPendingCustomConditionDelete(null);
  };

  useEffect(() => {
    if (isCustomConditionModalOpen || mobCustomOpen) {
      return;
    }

    setPendingCustomConditionDelete(null);
    setIsCustomConditionMultiDeleteMode(false);
    setMultiDeleteCustomConditionIndexes([]);
  }, [isCustomConditionModalOpen, mobCustomOpen]);

  const handleNextRound = () => {
      if (initiativeListContentRef.current) {
        initiativeListContentRef.current.scrollTop = 0;
      }

      setRound((prevRound) => {
        const sortedRows = [...sortedRowData]
          .filter((row) => !overlayActive[row.index]) // Only consider visible rows without overlays

        if (sortedRows.length === 0) {
          return prevRound;
        }
    
        const currentRowIndex = shiftedRowIndex ?? -1; // Start with no row shifted
        let nextRowIndex = null;
    
        // Find the next row to shift
        if (currentRowIndex === -1 || currentRowIndex >= sortedRows.length - 1) {
          // If no row is shifted or the last row is shifted, start from the first row
          nextRowIndex = 0;
        } else {
          // Otherwise, find the next row in the sorted order
          // const currentIndexInSorted = sortedRows.findIndex((row) => row.index === currentRowIndex);
          nextRowIndex = currentRowIndex + 1;
        }

        setViewCharacterIndex(null);
        setViewedSummon(null);

        // Update the shifted row
        setShiftedRowIndex(nextRowIndex);

        // Increment the round counter only if we loop back to the first row
        return nextRowIndex === 0 ? prevRound + 1 : prevRound;
      });
    };
  
  const handlePreviousRound = () => {
    setRound((prevRound) => {
      const sortedRows = [...sortedRowData]
        .filter((row) => !overlayActive[row.index]) // Only consider visible rows without overlays

      if (sortedRows.length === 0) {
        return prevRound;
      }
  
      const currentRowIndex = shiftedRowIndex ?? -1; // Start with no row shifted
      let previousRowIndex = null;
  
      // Find the previous row to shift
      if (currentRowIndex === -1 || currentRowIndex === 0) {
        // If no row is shifted or the first row is shifted, move to the last row
        previousRowIndex = sortedRows.length - 1;
      } else if (currentRowIndex >= sortedRows.length) {
        previousRowIndex = sortedRows.length - 1;
      } else {
        // Otherwise, find the previous row in the sorted order
        previousRowIndex = currentRowIndex - 1;
      }

      setViewCharacterIndex(null);
  
      // Update the shifted row
      setShiftedRowIndex(previousRowIndex);
  
      // Decrement the round counter only if we loop back to the last row
      return previousRowIndex === sortedRows.length - 1 ? Math.max(prevRound - 1, 1) : prevRound;
    });
  };
  
  const handleOpenModal = (rowIndex) => {
    setIsModalOpen(rowIndex);
    setCharacterName('');
    setAffiliation('');
    setAddSummons(false);
    setSummonNames(['']);
    setMultipleEnemiesType(false);
    setEnemyTypeCount('');
    setEnemyCountExceededLimit(false);
    setNameIndividualEnemies(false);
    setEnemyIndividualNames([]);
    setMobileCharacterDetailModal(null);
    setMobileEnemyModalStep('setup');
    setMobileSummonsConfirmed(false);
    setMobileEnemiesConfirmed(false);
    setEditCharacterIndex(null);
  };
  
  const handleCloseModal = () => {
    setIsModalOpen(null);
    setCharacterName('');
    setAffiliation('');
    setAddSummons(false);
    setSummonNames(['']);
    setMultipleEnemiesType(false);
    setEnemyTypeCount('');
    setEnemyCountExceededLimit(false);
    setNameIndividualEnemies(false);
    setEnemyIndividualNames([]);
    setMobileCharacterDetailModal(null);
    setMobileEnemyModalStep('setup');
    setMobileSummonsConfirmed(false);
    setMobileEnemiesConfirmed(false);
    setEditCharacterIndex(null);
  };

  const handleCloseMobileCharacterDetailModal = () => {
    if (mobileCharacterDetailModal === 'summons') {
      setMobileSummonsConfirmed(true);
    }
    if (mobileCharacterDetailModal === 'enemies') {
      setMobileEnemiesConfirmed(true);
    }
    setMobileCharacterDetailModal(null);
  };

  const handleSubmitMobileEnemiesModal = () => {
    if (mobileEnemyModalStep === 'setup' && nameIndividualEnemies) {
      setEnemyIndividualNames((prev) => (prev.length > 0 ? prev : ['']));
      setMobileEnemyModalStep('names');
      return;
    }

    setMobileEnemiesConfirmed(true);
    setMobileCharacterDetailModal(null);
    setMobileEnemyModalStep('setup');
  };

  const handleBackFromEnemyNamesModal = () => {
    setMobileEnemyModalStep('setup');
    setNameIndividualEnemies(false);
    setEnemyIndividualNames([]);
  };

  const handleBackFromSummonsModal = () => {
    setAddSummons(false);
    setSummonNames(['']);
    setMobileSummonsConfirmed(false);
    setMobileCharacterDetailModal(null);
  };

  const handleBackFromEnemiesModal = () => {
    setMultipleEnemiesType(false);
    setEnemyTypeCount('');
    setEnemyCountExceededLimit(false);
    setNameIndividualEnemies(false);
    setEnemyIndividualNames([]);
    setMobileEnemyModalStep('setup');
    setMobileEnemiesConfirmed(false);
    setMobileCharacterDetailModal(null);
  };

  const handleSummonNameChange = (index, value) => {
    setSummonNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const promoteNextSummonInput = (index, focusNewInput = false) => {
    setSummonNames((prev) => {
      const value = (prev[index] || '').trim();
      if (!value) return prev;
      if (index !== prev.length - 1) return prev;
      if (prev.length >= 10) return prev;
      if (focusNewInput) {
        nextSummonFocusIndexRef.current = prev.length;
      }
      return [...prev, ''];
    });
  };

  const handleSummonEnter = (index) => {
    const nextInput = summonInputRefs.current[index + 1];
    if (nextInput) {
      nextInput.focus();
      return;
    }
    promoteNextSummonInput(index, true);
  };

  const addSummonInput = () => {
    if (summonNames.length >= 10) {
      return;
    }

    nextSummonFocusIndexRef.current = summonNames.length;
    setSummonNames((prev) => [...prev, '']);
  };

  const removeSummonInput = (index) => {
    if (summonNames.length === 1) {
      setAddSummons(false);
      setSummonNames(['']);
      setMobileSummonsConfirmed(false);
      setMobileCharacterDetailModal(null);
      return;
    }

    setSummonNames((prev) => {
      const updated = prev.filter((_, i) => i !== index);
      return updated.length > 0 ? updated : [''];
    });
  };

  const removeEnemyIndividualInput = (index) => {
    setEnemyIndividualNames((prev) => prev.filter((_, currentIndex) => currentIndex !== index));
    setEnemyTypeCount((prev) => {
      const parsed = Number.parseInt(prev, 10);
      if (!Number.isFinite(parsed) || parsed <= 1) {
        setNameIndividualEnemies(false);
        return '';
      }
      return String(parsed - 1);
    });
  };

  const handleEnemyIndividualNameChange = (index, value) => {
    setEnemyIndividualNames((prev) => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const promoteNextEnemyInput = (index) => {
    setEnemyIndividualNames((prev) => {
      const value = (prev[index] || '').trim();
      if (!value) return prev;
      if (index !== prev.length - 1) return prev;
      if (prev.length >= 30) return prev;
      setEnemyTypeCount(String(prev.length + 1));
      return [...prev, ''];
    });
  };

  const handleEnemyNameEnter = (index) => {
    const nextInput = enemyNameInputRefs.current[index + 1];
    if (nextInput) {
      nextInput.focus();
      return;
    }
    promoteNextEnemyInput(index);
  };

  useEffect(() => {
    if (nextSummonFocusIndexRef.current === null) return;
    const targetIndex = nextSummonFocusIndexRef.current;
    const targetInput = summonInputRefs.current[targetIndex];
    if (targetInput) {
      targetInput.focus();
    }
    nextSummonFocusIndexRef.current = null;
  }, [summonNames]);

  useEffect(() => {
    if (!nameIndividualEnemies) return;

    const count = Number.parseInt(enemyTypeCount, 10);
    const safeCount = Number.isFinite(count) && count > 0 ? Math.min(count, 30) : 0;

    setEnemyIndividualNames((prev) =>
      Array.from({ length: safeCount }, (_, index) => prev[index] || '')
    );
  }, [enemyTypeCount, nameIndividualEnemies]);
  
  const handleSubmit = (event) => {
    event.preventDefault();

    // Validate form inputs
    if (!characterName.trim() || !affiliation) {
      setErrorMessage('Please fill out all fields before submitting.');
      return;
    }

    if (supportsGroupedIndividuals(affiliation) && multipleEnemiesType) {
      const parsedCount = Number.parseInt(enemyTypeCount, 10);
      if (!Number.isFinite(parsedCount) || parsedCount < 1) {
        setErrorMessage('Please input the number of characters for this type.');
        return;
      }
    }

    const updatedData = [...rowData];
    const cleanedSummons = affiliation === 'Player Character' && addSummons
      ? summonNames
        .map((name) => name.trim())
        .filter((name) => name.length > 0)
        .slice(0, 10)
      : [];
    const parsedEnemyCount = Number.parseInt(enemyTypeCount, 10);
    const safeEnemyCount = Number.isFinite(parsedEnemyCount) && parsedEnemyCount > 0
      ? Math.min(parsedEnemyCount, 30)
      : 0;
    const cleanedEnemyIndividualNames = supportsGroupedIndividuals(affiliation) && multipleEnemiesType && nameIndividualEnemies
      ? Array.from({ length: safeEnemyCount }, (_, index) => {
          const typedName = (enemyIndividualNames[index] || '').trim();
          return typedName || `${characterName} ${index + 1}`;
        })
      : [];
    const generatedEnemyIndividualNames = supportsGroupedIndividuals(affiliation) && multipleEnemiesType && !nameIndividualEnemies
      ? Array.from({ length: safeEnemyCount }, (_, index) => `${characterName} ${index + 1}`)
      : [];
    const companionNames = supportsGroupedIndividuals(affiliation)
      ? (multipleEnemiesType ? (nameIndividualEnemies ? cleanedEnemyIndividualNames : generatedEnemyIndividualNames) : [])
      : cleanedSummons;

    if (editCharacterIndex !== null) {
      // Edit existing character
      const existingSummonConditions = updatedData[editCharacterIndex].summonConditions || {};
      const nextSummonConditions = {};
      companionNames.forEach((summonName) => {
        nextSummonConditions[summonName] = existingSummonConditions[summonName] || [];
      });

      updatedData[editCharacterIndex] = {
        ...updatedData[editCharacterIndex],
        name: characterName,
        affiliation: affiliation,
        summons: companionNames,
        summonConditions: nextSummonConditions,
        multipleEnemiesType: supportsGroupedIndividuals(affiliation) ? multipleEnemiesType : false,
        enemyTypeCount: supportsGroupedIndividuals(affiliation) && multipleEnemiesType ? safeEnemyCount : 0,
        nameIndividualEnemies: supportsGroupedIndividuals(affiliation) ? nameIndividualEnemies : false,
        enemyIndividualNames: supportsGroupedIndividuals(affiliation) ? cleanedEnemyIndividualNames : [],
      };
      setRowData(updatedData);
      setEditCharacterIndex(null);
    } else {
      // Add new character logic
      const newSummonConditions = {};
      companionNames.forEach((summonName) => {
        newSummonConditions[summonName] = [];
      });

      updatedData[isModalOpen] = {
        ...updatedData[isModalOpen],
        name: characterName,
        affiliation: affiliation,
        summons: companionNames,
        summonConditions: newSummonConditions,
        multipleEnemiesType: supportsGroupedIndividuals(affiliation) ? multipleEnemiesType : false,
        enemyTypeCount: supportsGroupedIndividuals(affiliation) && multipleEnemiesType ? safeEnemyCount : 0,
        nameIndividualEnemies: supportsGroupedIndividuals(affiliation) ? nameIndividualEnemies : false,
        enemyIndividualNames: supportsGroupedIndividuals(affiliation) ? cleanedEnemyIndividualNames : [],
      };
      setRowData(updatedData);

      const updatedOverlay = [...overlayActive];
      updatedOverlay[isModalOpen] = false;
      if (isModalOpen + 1 < updatedOverlay.length) {
        updatedOverlay[isModalOpen + 1] = true;
      }
      setOverlayActive(updatedOverlay);

      const updatedVisibility = [...rowVisibility];
      if (isModalOpen + 1 < updatedVisibility.length) {
        updatedVisibility[isModalOpen + 1] = true;
      }
      setRowVisibility(updatedVisibility);
    }

    // Reset modal state
    setIsModalOpen(null);
    setCharacterName('');
    setAffiliation('');
    setAddSummons(false);
    setSummonNames(['']);
    setMultipleEnemiesType(false);
    setEnemyTypeCount('');
    setEnemyCountExceededLimit(false);
    setNameIndividualEnemies(false);
    setEnemyIndividualNames([]);
    setMobileCharacterDetailModal(null);
    setMobileEnemyModalStep('setup');
    setMobileSummonsConfirmed(false);
    setMobileEnemiesConfirmed(false);
    setErrorMessage('');
  };
  
  const handleInitiativeChange = (index, value) => {
    const newInitiative = value ? parseFloat(value) : null;

    // If there's an active character and this row's new initiative beats theirs,
    // queue this row to become the new active after re-sort.
    if (
      newInitiative !== null &&
      shiftedRowIndex !== null &&
      sortedRowData[shiftedRowIndex] &&
      sortedRowData[shiftedRowIndex].index !== index
    ) {
      const activeInitiative = sortedRowData[shiftedRowIndex].initiative ?? -Infinity;
      if (newInitiative > activeInitiative) {
        pendingActiveRowDataIndexRef.current = index;
      }
    }

    const updatedData = [...rowData];
    updatedData[index] = { ...updatedData[index], initiative: newInitiative };
    setRowData(updatedData);
  };

  const handleArmorClassChange = (index, value) => {
    const updatedData = [...rowData];
    updatedData[index] = { ...updatedData[index], armorClass: value };
    setRowData(updatedData);
  };

  const handleHitPointsChange = (index, value) => {
    const updatedData = [...rowData];
    updatedData[index] = { ...updatedData[index], hitPoints: value };
    setRowData(updatedData);
  };

  const updateViewCharacterIndex = (index) => {
    if (viewCharacterIndex === index) {
      setViewCharacterIndex(null);
      setViewedSummon(null);
    } else {
      setViewCharacterIndex(index);
      setViewedSummon(null);
    }
  }

  const showMobileConditionsPanel = () => {
    if (!isMobileLayout && !isTabletLayout) {
      return;
    }

    const initiativeElement = document.getElementsByClassName("initiative-list")[0];
    const rightToggleElement = document.getElementsByClassName("right-show-conditions")[0];
    const leftToggleElement = document.getElementsByClassName("left-show-initiative")[0];
    const conditionsElement = document.getElementsByClassName("conditions-list")[0]
      || document.getElementsByClassName("conditions-list-res")[0];

    if (initiativeElement) {
      initiativeElement.style.display = 'none';
    }
    if (leftToggleElement) {
      leftToggleElement.style.display = 'inline-flex';
    }
    if (rightToggleElement) {
      rightToggleElement.style.display = 'none';
    }
    if (conditionsElement && conditionsElement.classList.contains("conditions-list")) {
      conditionsElement.classList.remove("conditions-list");
      conditionsElement.classList.add("conditions-list-res");
    }
  };

  const showMobileInitiativePanel = () => {
    if (!isMobileLayout && !isTabletLayout) {
      return;
    }

    setViewCharacterIndex(null);
    setViewedSummon(null);

    const initiativeElement = document.getElementsByClassName("initiative-list")[0];
    const rightToggleElement = document.getElementsByClassName("right-show-conditions")[0];
    const leftToggleElement = document.getElementsByClassName("left-show-initiative")[0];
    const conditionsElement = document.getElementsByClassName("conditions-list-res")[0]
      || document.getElementsByClassName("conditions-list")[0];

    if (initiativeElement) {
      initiativeElement.style.display = 'flex';
    }
    if (rightToggleElement) {
      rightToggleElement.style.display = 'inline-flex';
    }
    if (leftToggleElement) {
      leftToggleElement.style.display = 'none';
    }
    if (conditionsElement && conditionsElement.classList.contains("conditions-list-res")) {
      conditionsElement.classList.remove("conditions-list-res");
      conditionsElement.classList.add("conditions-list");
    }
  };

  const getDisplayedConditions = (realIndex) => {
    if (
      viewedSummon &&
      viewedSummon.rowIndex === realIndex &&
      viewedSummon.summonName
    ) {
      return rowData[realIndex]?.summonConditions?.[viewedSummon.summonName] || [];
    }
    return rowData[realIndex]?.conditions || [];
  };

  const removeDisplayedCondition = (realIndex, condition) => {
    setRowData((prevRows) => {
      const updatedRows = [...prevRows];

      if (
        viewedSummon &&
        viewedSummon.rowIndex === realIndex &&
        viewedSummon.summonName
      ) {
        const row = updatedRows[realIndex];
        const summonName = viewedSummon.summonName;
        const currentSummonConditions = row.summonConditions?.[summonName] || [];
        const nextSummonConditions = currentSummonConditions.filter((c) =>
          typeof c === "object"
            ? c.name !== (condition.name || condition)
            : c !== (condition.name || condition)
        );

        updatedRows[realIndex] = {
          ...row,
          summonConditions: {
            ...(row.summonConditions || {}),
            [summonName]: nextSummonConditions,
          },
        };

        return updatedRows;
      }

      const row = updatedRows[realIndex];
      updatedRows[realIndex] = {
        ...row,
        conditions: (row.conditions || []).filter((c) =>
          typeof c === "object"
            ? c.name !== (condition.name || condition)
            : c !== (condition.name || condition)
        ),
      };

      return updatedRows;
    });
  };

  const removeSummonCondition = (realIndex, summonName, condition) => {
    setRowData((prevRows) => {
      const updatedRows = [...prevRows];
      const row = updatedRows[realIndex];
      if (!row) return prevRows;

      const currentSummonConditions = row.summonConditions?.[summonName] || [];
      const nextSummonConditions = currentSummonConditions.filter((c) =>
        typeof c === "object"
          ? c.name !== (condition.name || condition)
          : c !== (condition.name || condition)
      );

      updatedRows[realIndex] = {
        ...row,
        summonConditions: {
          ...(row.summonConditions || {}),
          [summonName]: nextSummonConditions,
        },
      };

      return updatedRows;
    });
  };

  const getAttachedConditionGroups = (realIndex) => {
    if (viewedSummon && viewedSummon.rowIndex === realIndex && viewedSummon.summonName) {
      return [];
    }

    const row = rowData[realIndex];
    if (!row) return [];

    return (row.summons || [])
      .map((summonName) => ({
        summonName,
        conditions: row.summonConditions?.[summonName] || [],
      }))
      .filter((group) => group.conditions.length > 0);
  };

  const hasConditionsToRender = (realIndex) => {
    return getDisplayedConditions(realIndex).length > 0 || getAttachedConditionGroups(realIndex).length > 0;
  };

  const renderConditionRows = (realIndex) => {
    const displayedConditions = getDisplayedConditions(realIndex);
    const attachedConditionGroups = getAttachedConditionGroups(realIndex);
    const rowName = rowData[realIndex]?.name || 'Main Character';
    const shouldShowMainHeader = attachedConditionGroups.length > 0;

    return (
      <>
        {shouldShowMainHeader && (
          <div className="conditions-main-title">{rowName}'s Condition(s)</div>
        )}

        {displayedConditions.map((condition, i) => (
          <div key={`main-${realIndex}-${i}`} className="conditions-row">
            <div className={`condition-description${!isMobileLayout ? ' condition-description-inline-expiration' : ''}`}>
              <button
                className="remove-condition-button"
                onClick={() => removeDisplayedCondition(realIndex, condition)}
                aria-label={`Remove ${condition}`}
              >
                <img src={trashcanIcon} alt="Remove Condition" />
              </button>
              <div>
                <div>
                  <strong>{typeof condition === "object" ? condition.name : condition}</strong>
                </div>
                {!isMobileLayout && !isExpirationUnknown(condition) && (
                  <div className="condition-expiration condition-expiration-inline">
                    {getConditionExpirationText(condition)}
                  </div>
                )}
                <div>
                  {((typeof condition === "object" && condition?.description)
                    ? condition.description
                    : conditionDescriptions[typeof condition === "object" ? condition.name : condition]
                    || "Filler description for this condition.")
                    .split('???')
                    .map((line, idx) => (
                      <React.Fragment key={idx}>
                        {line}
                        <br />
                      </React.Fragment>
                    ))}
                </div>
              </div>
            </div>
            {isMobileLayout && (
              <div
                className={`condition-expiration${isExpirationUnknown(condition) ? ' condition-expiration-na' : ''}`}
              >
                {getConditionExpirationText(condition)}
              </div>
            )}
          </div>
        ))}

        {attachedConditionGroups.map(({ summonName, conditions }) => (
          <React.Fragment key={`attached-${realIndex}-${summonName}`}>
            <div className="conditions-subsection-title">{summonName}'s Condition(s)</div>
            {conditions.map((condition, i) => (
              <div key={`attached-${realIndex}-${summonName}-${i}`} className="conditions-row">
                <div className={`condition-description${!isMobileLayout ? ' condition-description-inline-expiration' : ''}`}>
                  <button
                    className="remove-condition-button"
                    onClick={() => removeSummonCondition(realIndex, summonName, condition)}
                    aria-label={`Remove ${condition}`}
                  >
                    <img src={trashcanIcon} alt="Remove Condition" />
                  </button>
                  <div>
                    <div>
                      <strong>{typeof condition === "object" ? condition.name : condition}</strong>
                    </div>
                    {!isMobileLayout && !isExpirationUnknown(condition) && (
                      <div className="condition-expiration condition-expiration-inline">
                        {getConditionExpirationText(condition)}
                      </div>
                    )}
                    <div>
                      {((typeof condition === "object" && condition?.description)
                        ? condition.description
                        : conditionDescriptions[typeof condition === "object" ? condition.name : condition]
                        || "Filler description for this condition.")
                        .split('???')
                        .map((line, idx) => (
                          <React.Fragment key={idx}>
                            {line}
                            <br />
                          </React.Fragment>
                        ))}
                    </div>
                  </div>
                </div>
                {isMobileLayout && (
                  <div
                    className={`condition-expiration${isExpirationUnknown(condition) ? ' condition-expiration-na' : ''}`}
                  >
                    {getConditionExpirationText(condition)}
                  </div>
                )}
              </div>
            ))}
          </React.Fragment>
        ))}
      </>
    );
  };

  const isViewingEnemyIndividual = (realIndex) => {
    return Boolean(
      viewedSummon &&
      viewedSummon.rowIndex === realIndex &&
      viewedSummon.summonName &&
      supportsGroupedIndividuals(rowData[realIndex]?.affiliation) &&
      rowData[realIndex]?.multipleEnemiesType
    );
  };

  const deleteViewedIndividualEnemy = (realIndex) => {
    if (!viewedSummon || viewedSummon.rowIndex !== realIndex || !viewedSummon.summonName) {
      return;
    }

    const summonName = viewedSummon.summonName;

    setRowData((prevRows) => {
      const updatedRows = [...prevRows];
      const row = updatedRows[realIndex];
      if (!row) return prevRows;

      const currentSummons = [...(row.summons || [])];
      const removeIndex = currentSummons.findIndex((name) => name === summonName);
      if (removeIndex < 0) return prevRows;

      currentSummons.splice(removeIndex, 1);

      const nextSummonConditions = { ...(row.summonConditions || {}) };
      delete nextSummonConditions[summonName];

      let nextEnemyIndividualNames = row.enemyIndividualNames || [];
      if (row.nameIndividualEnemies) {
        nextEnemyIndividualNames = [...nextEnemyIndividualNames];
        if (removeIndex < nextEnemyIndividualNames.length) {
          nextEnemyIndividualNames.splice(removeIndex, 1);
        }
      }

      updatedRows[realIndex] = {
        ...row,
        summons: currentSummons,
        summonConditions: nextSummonConditions,
        enemyTypeCount: row.multipleEnemiesType ? currentSummons.length : row.enemyTypeCount,
        enemyIndividualNames: row.nameIndividualEnemies ? nextEnemyIndividualNames : row.enemyIndividualNames,
      };

      return updatedRows;
    });

    setViewedSummon(null);
  };

  const getConditionBackgroundColor = (condition) => {
    if (typeof condition === 'object') {
      if (condition?.color) return condition.color;
      const name = condition?.name || condition?.conditionName;
      return conditionColors[name] || 'var(--neutral-condition-background)';
    }
    return conditionColors[condition] || 'var(--neutral-condition-background)';
  };

  const getConditionName = (condition) => (
    typeof condition === 'object' ? condition?.name : condition
  );

  const getPersonalConditionEntries = (row, shouldAggregateMinionConditions = false) => {
    const baseConditions = Array.isArray(row?.conditions) ? row.conditions : [];

    if (!(shouldAggregateMinionConditions && supportsGroupedIndividuals(row?.affiliation) && row?.multipleEnemiesType)) {
      return baseConditions
        .map((condition, idx) => {
          const conditionName = getConditionName(condition);
          if (!conditionName) {
            return null;
          }

          return {
            key: `${conditionName}-${idx}`,
            conditionName,
            displayText: conditionName,
            color: typeof condition === 'object' ? condition?.color : undefined,
          };
        })
        .filter(Boolean);
    }

    const summonNames = Array.isArray(row?.summons) ? row.summons : [];
    const summonConditions = row?.summonConditions || {};
    const conditionCounts = new Map();
    const conditionColorCache = new Map();

    summonNames.forEach((summonName) => {
      const minionConditions = Array.isArray(summonConditions[summonName])
        ? summonConditions[summonName]
        : [];
      const uniqueConditionsForMinion = new Set();

      minionConditions.forEach((condition) => {
        const conditionName = getConditionName(condition);
        if (!conditionName || uniqueConditionsForMinion.has(conditionName)) {
          return;
        }

        uniqueConditionsForMinion.add(conditionName);
        conditionCounts.set(conditionName, (conditionCounts.get(conditionName) || 0) + 1);
        if (!conditionColorCache.has(conditionName) && typeof condition === 'object' && condition?.color) {
          conditionColorCache.set(conditionName, condition.color);
        }
      });
    });

    if (conditionCounts.size > 0) {
      return Array.from(conditionCounts.entries()).map(([conditionName, count]) => ({
        key: `${conditionName}-${count}`,
        conditionName,
        displayText: `${conditionName} x${count}`,
        color: conditionColorCache.get(conditionName),
      }));
    }

    return baseConditions
      .map((condition, idx) => {
        const conditionName = getConditionName(condition);
        if (!conditionName) {
          return null;
        }

        return {
          key: `${conditionName}-${idx}`,
          conditionName,
          displayText: conditionName,
          color: typeof condition === 'object' ? condition?.color : undefined,
        };
      })
      .filter(Boolean);
  };

  const getMappedColorType = (affectType) => {
    switch (affectType) {
      case 'Positive':
        return 'var(--good-condition-background)';
      case 'Negative':
        return 'var(--bad-condition-background)';
      default:
        return 'var(--neutral-condition-background)';
    }
  }
  
  const getTextColor = (affiliation) => {
    switch (affiliation) {
      case 'Player Character':
        return 'var(--player-character-text-color)';
      case 'Enemy':
        return 'var(--enemy-character-text-color)';
      case 'Ally':
        return 'var(--ally-character-text-color)';
      case 'Neutral/Environmental':
        return 'var(--neutral-character-text-color)';
      default:
        return 'black';
    }
  };

  const getConditionExpirationText = (condition) => (
    typeof condition === "object"
      ? (condition.expiration || "NA / Unknown")
      : "NA / Unknown"
  );

  const isExpirationUnknown = (condition) => {
    const expirationText = getConditionExpirationText(condition);
    return expirationText === "NA / Unknown" || expirationText.includes("NA / Unknown");
  };

  useEffect(() => {
    localStorage.setItem("row-data", JSON.stringify(rowData));
    localStorage.setItem("overlay-active", JSON.stringify(overlayActive));
    localStorage.setItem("row-visibility", JSON.stringify(rowVisibility));
    localStorage.setItem("round", JSON.stringify(round));
    localStorage.setItem("shifted-row-index", JSON.stringify(shiftedRowIndex));
    localStorage.setItem("custom-conditions", JSON.stringify(customConditions));
    localStorage.setItem("condition-colors", JSON.stringify(conditionColors));
    localStorage.setItem("condition-descriptions", JSON.stringify(conditionDescriptions));
  }, [rowData, rowVisibility, overlayActive, round, shiftedRowIndex, customConditions, conditionColors, conditionDescriptions]);

  useEffect(() => {
    if (skipInitialShiftWiggleRef.current) {
      skipInitialShiftWiggleRef.current = false;
      return;
    }

    if (shiftedRowIndex === null) {
      setWiggleShiftedRowIndex(null);
      return;
    }

    setWiggleShiftedRowIndex(shiftedRowIndex);

    if (shiftWiggleTimeoutRef.current) {
      clearTimeout(shiftWiggleTimeoutRef.current);
    }

    shiftWiggleTimeoutRef.current = setTimeout(() => {
      setWiggleShiftedRowIndex(null);
      shiftWiggleTimeoutRef.current = null;
    }, 500);

    return () => {
      if (shiftWiggleTimeoutRef.current) {
        clearTimeout(shiftWiggleTimeoutRef.current);
        shiftWiggleTimeoutRef.current = null;
      }
    };
  }, [shiftedRowIndex]);

  useEffect(() => {
    const previousActiveRowIndex =
      shiftedRowIndex !== null && sortedRowData[shiftedRowIndex]
        ? sortedRowData[shiftedRowIndex].index
        : null;

    const visibleRows = rowData
      .map((data, index) => ({ ...data, index }))
      .filter((_, i) => rowVisibility[i]);

    const normalRows = visibleRows
      .filter((row) => !overlayActive[row.index])
      .sort((a, b) => {
        if (b.initiative !== a.initiative) {
          return (b.initiative ?? -Infinity) - (a.initiative ?? -Infinity);
        }
        return (a.name || '').localeCompare(b.name || '');
      });
  
    const overlayRows = visibleRows.filter((row) => overlayActive[row.index]);
  
    const sortedRows = [...normalRows, ...overlayRows];

    setSortedRowData(sortedRows);

    if (pendingActiveRowDataIndexRef.current !== null) {
      const pendingDataIndex = pendingActiveRowDataIndexRef.current;
      pendingActiveRowDataIndexRef.current = null;
      const newActivePos = normalRows.findIndex((row) => row.index === pendingDataIndex);
      if (newActivePos >= 0) {
        setShiftedRowIndex(newActivePos);
      } else if (previousActiveRowIndex !== null) {
        const nextShiftedRowIndex = sortedRows.findIndex((row) => row.index === previousActiveRowIndex);
        setShiftedRowIndex(nextShiftedRowIndex >= 0 ? nextShiftedRowIndex : null);
      }
    } else if (previousActiveRowIndex !== null) {
      const nextShiftedRowIndex = sortedRows.findIndex((row) => row.index === previousActiveRowIndex);
      setShiftedRowIndex(nextShiftedRowIndex >= 0 ? nextShiftedRowIndex : null);
    }
  }, [rowData, rowVisibility, overlayActive])

  useEffect(() => {
    localStorage.setItem('show-armor-class', JSON.stringify(showArmorClass));
  }, [showArmorClass]);

  useEffect(() => {
    localStorage.setItem('show-hit-points', JSON.stringify(showHitPoints));
  }, [showHitPoints]);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return undefined;
    }

    const mobileMediaQuery = window.matchMedia('(max-width: 767px)');
    const tabletMediaQuery = window.matchMedia('(min-width: 600px) and (max-width: 1024px)');

    const updateMobileLayout = (event) => {
      setIsMobileLayout(event.matches);
    };

    const updateTabletLayout = (event) => {
      setIsTabletLayout(event.matches);
    };

    setIsMobileLayout(mobileMediaQuery.matches);
    setIsTabletLayout(tabletMediaQuery.matches);

    if (typeof mobileMediaQuery.addEventListener === 'function') {
      mobileMediaQuery.addEventListener('change', updateMobileLayout);
      tabletMediaQuery.addEventListener('change', updateTabletLayout);
      return () => {
        mobileMediaQuery.removeEventListener('change', updateMobileLayout);
        tabletMediaQuery.removeEventListener('change', updateTabletLayout);
      };
    }

    mobileMediaQuery.addListener(updateMobileLayout);
    tabletMediaQuery.addListener(updateTabletLayout);
    return () => {
      mobileMediaQuery.removeListener(updateMobileLayout);
      tabletMediaQuery.removeListener(updateTabletLayout);
    };
  }, []);

  const characterRows = sortedRowData.filter((row) => !overlayActive[row.index]);
  const overlayRows = sortedRowData.filter((row) => overlayActive[row.index]);

  const displayedCharacterRows =
    shiftedRowIndex !== null && shiftedRowIndex >= 0 && shiftedRowIndex < characterRows.length
      ? [...characterRows.slice(shiftedRowIndex), ...characterRows.slice(0, shiftedRowIndex)]
      : characterRows;

  const displayedSortedRowData = [...displayedCharacterRows, ...overlayRows];
  const lowestInitiativeRowIndex = characterRows.length > 0
    ? characterRows[characterRows.length - 1].index
    : null;
  const conditionTargets = getConditionTargets();
  const selectedConditionTargetLabels = conditionTargets
    .filter((target) => selectedCharacters.includes(target.id))
    .map((target) => target.label);
  const selectedConditionLabels = selectedConditions;
  const isAddConditionMobileLayout = isMobileLayout && !isTabletLayout;
  const showMobileTargetStep = isAddConditionMobileLayout && mobileAddConditionStep === 1;
  const showMobileConditionStep = isAddConditionMobileLayout && mobileAddConditionStep === 2;
  const showMobileExpirationStep = isAddConditionMobileLayout && mobileAddConditionStep === 3;
  
  return (
    <div className="initiative-page-scroll">
    {hostTemporarilyDisconnected && sessionMode === 'joining' && (
      <div className="session-ended-overlay">
        <div className="session-ended-modal">
          <p className="session-ended-text">Host has temporarily disconnected. Stay on this screen and wait for them to come back, or click the button below to leave the session.</p>
          <button className="session-host-leave-button" onClick={handleLeaveSession}>
            Leave Session
          </button>
        </div>
      </div>
    )}
    {sessionEnded && (
      <div className="session-ended-overlay">
        <div className="session-ended-modal">
          <p className="session-ended-text">Host has disconnected the session. Click here to refresh and go to your own session.</p>
          <button className="session-ended-refresh-button" onClick={() => { window.location.href = '/initiative'; }}>
            Refresh
          </button>
        </div>
      </div>
    )}
    {isSettingsModalOpen && (
      <div className="modal-overlay settings-modal">
        <div className="modal">
          <h2>Settings</h2>
          <div className="settings-view-options">
            <label className={`settings-view-toggle settings-view-ac${isMobileLayout ? ' settings-view-toggle-disabled' : ''}`}>
              <span className="settings-switch">
                <input
                  type="checkbox"
                  aria-label="View Armor Class"
                  checked={viewArmorClassToggle}
                  disabled={isMobileLayout}
                  onChange={(e) => setViewArmorClassToggle(e.target.checked)}
                />
                <span className="settings-slider" />
              </span>
              <span className="settings-view-toggle-text-group">
                <span>View Armor Class</span>
                {isMobileLayout && <span className="settings-view-toggle-note">Only available on desktop</span>}
              </span>
            </label>
            <label className={`settings-view-toggle settings-view-hp${isMobileLayout ? ' settings-view-toggle-disabled' : ''}`}>
              <span className="settings-switch">
                <input
                  type="checkbox"
                  aria-label="View Hit Points"
                  checked={viewHitPointsToggle}
                  disabled={isMobileLayout}
                  onChange={(e) => setViewHitPointsToggle(e.target.checked)}
                />
                <span className="settings-slider" />
              </span>
              <span className="settings-view-toggle-text-group">
                <span>View Hit Points</span>
                {isMobileLayout && <span className="settings-view-toggle-note">Only available on desktop</span>}
              </span>
            </label>
          </div>
          <div className="settings-subtitle settings-connect-title">
            Connect With Others
          </div>
          <div className="settings-connect-section">
            {sessionMode === null && (
              <div className="settings-connect-buttons-group">
                <div className="settings-connect-buttons">
                  <button
                    className="settings-host-button"
                    onClick={handleHostSession}
                    disabled={isSessionLoading}
                  >
                    {isSessionLoading ? 'Connecting...' : 'Host Session'}
                  </button>
                  <button
                    className="settings-join-button"
                    onClick={() => { setSessionMode('join-input'); setJoinError(''); setJoinCodeInput(''); setHostError(''); }}
                    disabled={isSessionLoading}
                  >
                    Join Session
                  </button>
                </div>
                {hostError && <span className="settings-join-error">{hostError}</span>}
              </div>
            )}
            {sessionMode === 'hosting' && (
              <div className="settings-session-active">
                <div className="settings-session-code-row">
                  <span className="settings-session-code-label">
                    Your Session Code is: <strong className="settings-session-code">{activeSessionCode}</strong>
                  </span>
                  <button className="settings-share-button" onClick={handleShareSession}>
                    {shareCopied ? 'Copied!' : 'Share'}
                  </button>
                </div>
                <button className="settings-end-session-button" onClick={handleEndSession}>
                  End Sharing Session
                </button>
              </div>
            )}
            {sessionMode === 'join-input' && (
              <div className="settings-join-input-group">
                <div className="settings-join-row">
                  <span className="settings-join-label">Input Session Code:</span>
                  <input
                    className="settings-join-code-input"
                    type="text"
                    maxLength={6}
                    value={joinCodeInput}
                    placeholder="ABC123"
                    onChange={(e) => {
                      setJoinCodeInput(e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase());
                      setJoinError('');
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleJoinSession(); }}
                    autoFocus
                  />
                  <button
                    className="settings-join-button-submit"
                    onClick={handleJoinSession}
                    disabled={isSessionLoading}
                  >
                    {isSessionLoading ? '...' : 'Join'}
                  </button>
                </div>
                {joinError && <span className="settings-join-error">{joinError}</span>}
              </div>
            )}
            {sessionMode === 'joining' && (
              <div className="settings-session-active">
                <span className="settings-session-code-label">
                  Connected to: <strong className="settings-session-code">{activeSessionCode}</strong>
                </span>
                <button className="settings-leave-session-button" onClick={handleLeaveSession}>
                  Leave Shared Session
                </button>
              </div>
            )}
          </div>
          <div className="settings-subtitle">
            Clean up Initiative List
          </div>
          <div className="settings-caution-text">
            Caution: these actions cannot be undone!
          </div>
          <div className="settings-parent-buttons">
            <div className="settings-action-group">
              <button className="settings-new-combat-button" onClick={handleNewCombat}>New Combat</button>
              <div className="settings-action-description">
                Removes enemies and neutral / environmental characters, clears initiative, and resets the round to 1.
              </div>
            </div>
            <div className="settings-action-group">
              <button className="settings-full-reset-button" onClick={handleFullReset}>Full Reset</button>
              <div className="settings-action-description">
                Removes all characters, conditions, and initiative values and resets the round to 1.
              </div>
            </div>
          </div>
          <form
            onSubmit={handleSettingsSubmit}
          >
            <div className="settings-checkbox-group">
              <label>
                <input
                  type="checkbox"
                  checked={resetRound}
                  onChange={e => setResetRound(e.target.checked)}
                />
                Reset Round Count to 1
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={resetInitiative}
                  onChange={e => setResetInitiative(e.target.checked)}
                />
                Clear Initiative Values
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={removeAllConditions}
                  onChange={e => setRemoveAllConditions(e.target.checked)}
                />
                Remove All Conditions
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={removeNeutral}
                  onChange={e => setRemoveNeutral(e.target.checked)}
                />
                Remove Neutral/Environment
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={removeEnemies}
                  onChange={e => setRemoveEnemies(e.target.checked)}
                />
                Remove Enemies
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={removeAllies}
                  onChange={e => setRemoveAllies(e.target.checked)}
                />
                Remove Allies
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={removePlayers}
                  onChange={e => setRemovePlayers(e.target.checked)}
                />
                Remove Player Characters
              </label>
              <label>
                <input
                  type="checkbox"
                  checked={fillCharacters}
                  onChange={e => setFillCharacters(e.target.checked)}
                />
                Fill with Random Characters
              </label>
            </div>
            <div className="modal-button-group" style={{ marginTop: 16 }}>
            <button type="submit" className="settings-submit-button">Submit</button>
            <button
              type="button"
              className="close-modal-button"
              onClick={() => {
                setIsSettingsModalOpen(false);
                resetSettingsCheckboxes(); // <-- Add this line
              }}
            >
              X
            </button>
          </div>
        </form>
        </div>
      </div>
    )}

    <div className="wrapper">
      <div className="app-container">
          <div
            className="initiative-list"
            style={{
              '--conditions-col-width': showArmorClass
                ? 'var(--conditions-col-width-base)'
                : 'calc(var(--conditions-col-width-base) + var(--ac-col-width))',
              '--name-col-width': showHitPoints
                ? 'var(--name-col-width-base)'
                : 'calc(var(--name-col-width-base) + var(--hp-col-width))'
            }}
          >
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-top-left" />
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-top-right" />
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-bottom-left" />
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-bottom-right" />
            <div className="initiative-banner">
              <div className="banner-gear-icon">
                <button
                  className="gear-icon-button"
                  onClick={() => {
                    setViewArmorClassToggle(showArmorClass);
                    setViewHitPointsToggle(showHitPoints);
                    setIsSettingsModalOpen(true);
                  }}
                  aria-label="Open Settings"
                  title="Settings"
                >
                  <img src={gearIcon} alt="Settings" className="gear-icon-img" />
                </button>
              </div>
              <div className="round-counter">Round {round}</div>
              <div className="initiative-title">Initiative List</div>
              <div className="next-back">
                {/* Conditionally render the buttons based on the overlay of the first row */}
                {!overlayActive[0] && (
                  <>
                    <button className="back-button" onClick={handlePreviousRound}>
                    </button>
                    <button className="next-button" onClick={handleNextRound}>
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="initiative-list-column-headers">
              <div className="column-header-initiative">Initiative</div>
              <div className="column-header-edit">Edit</div>
              <div className="column-header-delete">Delete</div>
              {showArmorClass && <div className="column-header-ac">AC</div>}
              {showHitPoints && <div className="column-header-hp">HP</div>}
              <div className="column-header-name">Name</div>
              <div className="column-header-conditions">Conditions</div>
            </div>
            <div className="initiative-list-content" ref={initiativeListContentRef}>
              {displayedSortedRowData.map(({ index }, shiftedIndex) => {
                const isEnemyWithIndividuals =
                  supportsGroupedIndividuals(rowData[index].affiliation) &&
                  rowData[index].multipleEnemiesType &&
                  (rowData[index].summons || []).length > 0;
                const isActiveRow = shiftedRowIndex !== null && sortedRowData[shiftedRowIndex]?.index === index;
                const isViewedRow = viewCharacterIndex !== null && displayedSortedRowData[viewCharacterIndex]?.index === index;
                const isWiggleRow = wiggleShiftedRowIndex !== null && sortedRowData[wiggleShiftedRowIndex]?.index === index;
                const shouldShowEnemyIndividuals = isEnemyWithIndividuals && (isActiveRow || isViewedRow);
                const displayName = isEnemyWithIndividuals && !shouldShowEnemyIndividuals
                  ? `${rowData[index].name || 'No Name'} x${(rowData[index].summons || []).length}`
                  : (rowData[index].name || 'No Name');
                const personalConditionEntries = getPersonalConditionEntries(
                  rowData[index],
                  !isMobileLayout || isTabletLayout
                );
                const isRoundDividerTarget = lowestInitiativeRowIndex !== null && index === lowestInitiativeRowIndex;

                return (
                <div
                  key={index}
                  className={`row ${isMobileLayout ? 'row-mobile-viewable' : ''} ${isActiveRow ? 'shifted-row' : ''} ${isWiggleRow ? 'shifted-row-wiggle' : ''} ${isRoundDividerTarget ? 'round-divider-target' : ''}`}
                  onClick={(e) => {
                    if (!isMobileLayout || overlayActive[index]) {
                      return;
                    }

                    const interactiveTarget = e.target.closest(
                      'button, input, textarea, select, label, .name-input-summon-item'
                    );

                    if (interactiveTarget) {
                      return;
                    }

                    updateViewCharacterIndex(shiftedIndex);
                    showMobileConditionsPanel();
                  }}
                  style={{
                    backgroundColor:
                      isViewedRow
                        ? 'var(--view-character-background-color)'
                        : '',
                    backgroundImage:
                      isViewedRow
                        ? 'var(--view-character-background-image)'
                        : ''
                  }}
                >
                  {overlayActive[index] && (
                    <div className="add-new-character">
                      <button
                        className="add-character-button"
                        onClick={() => handleOpenModal(index)}
                      >
                        <img
                          src={plusIcon}
                          alt="Add Character"
                          className="add-character-icon"
                        />
                      </button>
                    </div>
                  )}
                  <div className="initiative-input">
                    <input
                      type="number"
                      className="initiative-textbox"
                      placeholder="#"
                      value={rowData[index].initiative ?? ''}
                      onChange={(e) => handleInitiativeChange(index, e.target.value)}
                    />
                    {isRoundDividerTarget && (
                      <div className="round-inline-counter">Round {round + 1}</div>
                    )}
                  </div>
                  <div className="row-actions">
                    <div className="edit-character">
                      <button
                        className="editCharacterButton"
                        title="Edit"
                        onClick={() => {
                          setEditCharacterIndex(index);
                          setCharacterName(rowData[index].name);
                          setAffiliation(rowData[index].affiliation);
                          if (rowData[index].affiliation === 'Player Character' && (rowData[index].summons || []).length > 0) {
                            setAddSummons(true);
                            setSummonNames([...rowData[index].summons]);
                          } else {
                            setAddSummons(false);
                            setSummonNames(['']);
                          }

                          if (supportsGroupedIndividuals(rowData[index].affiliation) && rowData[index].multipleEnemiesType) {
                            setMultipleEnemiesType(true);
                            setEnemyTypeCount(String(rowData[index].enemyTypeCount || ''));
                            setEnemyCountExceededLimit(false);
                            setNameIndividualEnemies(Boolean(rowData[index].nameIndividualEnemies));
                            setEnemyIndividualNames(
                              rowData[index].nameIndividualEnemies
                                ? [...(rowData[index].enemyIndividualNames || rowData[index].summons || [])]
                                : []
                            );
                          } else {
                            setMultipleEnemiesType(false);
                            setEnemyTypeCount('');
                            setEnemyCountExceededLimit(false);
                            setNameIndividualEnemies(false);
                            setEnemyIndividualNames([]);
                          }

                          setIsModalOpen(index);
                        }}
                      >
                        <img src={pencilIcon} alt="Edit" className="edit-icon" />
                      </button>
                    </div>
                    <div className="delete-character">
                      <button
                        className="deleteCharacterButton"
                        title="Delete"
                        onClick={() => {
                          setDeleteConfirmIndex(index);
                        }}
                      >
                        <img src={trashcanIcon} alt="Delete" className="delete-icon" />
                      </button>
                    </div>
                  </div>
                  {showArmorClass && (
                    <div className="ac-input">
                      <input
                        type="text"
                        className="initiative-textbox"
                        placeholder="AC"
                        value={rowData[index].armorClass ?? ''}
                        onChange={(e) => handleArmorClassChange(index, e.target.value)}
                      />
                    </div>
                  )}
                  {showHitPoints && (
                    <div className="hp-input">
                      <input
                        type="text"
                        className="initiative-textbox"
                        placeholder="HP"
                        value={rowData[index].hitPoints ?? ''}
                        onChange={(e) => handleHitPointsChange(index, e.target.value)}
                      />
                    </div>
                  )}
                  {/* Remove the character-menu and dropdown */}
                  <div
                    className="name-input"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (overlayActive[index]) {
                        return;
                      }

                      const interactiveTarget = e.target.closest('.name-input-summon-item');
                      if (interactiveTarget) {
                        return;
                      }

                      updateViewCharacterIndex(shiftedIndex);
                      showMobileConditionsPanel();
                    }}
                  >
                    <div className="name-input-main" style={{ color: getTextColor(rowData[index].affiliation) }}>
                      {displayName}
                    </div>
                    {!isMobileLayout && (rowData[index].summons || []).length > 0 && (!isEnemyWithIndividuals || shouldShowEnemyIndividuals) && (
                      <div className="name-input-summons">
                        {rowData[index].summons.map((summonName, summonIdx) => (
                          <div
                            key={`${summonName}-${summonIdx}`}
                            className={`name-input-summon-item${supportsGroupedIndividuals(rowData[index].affiliation) ? ' enemy-individual-item' : ''}${rowData[index].affiliation === 'Ally' ? ' ally-individual-item' : ''}${rowData[index].affiliation === 'Neutral/Environmental' ? ' neutral-individual-item' : ''}${viewedSummon?.rowIndex === index && viewedSummon?.summonName === summonName ? ' selected-summon' : ''}`}
                            onClick={() => {
                              const isSameSummonSelected =
                                viewedSummon?.rowIndex === index && viewedSummon?.summonName === summonName;

                              if (isSameSummonSelected) {
                                setViewedSummon(null);
                                setViewCharacterIndex(null);
                                return;
                              }

                              setViewCharacterIndex(shiftedIndex);
                              setViewedSummon({ rowIndex: index, summonName });
                              if (isMobileLayout || isTabletLayout) {
                                showMobileConditionsPanel();
                              }
                            }}
                          >
                            <div className="summon-name-label">{summonName}</div>
                            <div className="summon-condition-dots">
                              {(rowData[index].summonConditions?.[summonName] || []).map((condition, condIdx) => (
                                <span
                                  key={`${summonName}-dot-${condIdx}`}
                                  className="summon-condition-dot"
                                  style={{
                                    backgroundColor: getConditionBackgroundColor(condition)
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {isMobileLayout && (rowData[index].summons || []).length > 0 && (!isEnemyWithIndividuals || shouldShowEnemyIndividuals) && (
                    <div className="row-summons">
                      <div className="name-input-summons">
                        {rowData[index].summons.map((summonName, summonIdx) => (
                          <div
                            key={`${summonName}-${summonIdx}`}
                            className={`name-input-summon-item${supportsGroupedIndividuals(rowData[index].affiliation) ? ' enemy-individual-item' : ''}${rowData[index].affiliation === 'Ally' ? ' ally-individual-item' : ''}${rowData[index].affiliation === 'Neutral/Environmental' ? ' neutral-individual-item' : ''}${viewedSummon?.rowIndex === index && viewedSummon?.summonName === summonName ? ' selected-summon' : ''}`}
                            onClick={() => {
                              const isSameSummonSelected =
                                viewedSummon?.rowIndex === index && viewedSummon?.summonName === summonName;

                              if (isSameSummonSelected) {
                                setViewedSummon(null);
                                setViewCharacterIndex(null);
                                return;
                              }

                              setViewCharacterIndex(shiftedIndex);
                              setViewedSummon({ rowIndex: index, summonName });
                              if (isMobileLayout || isTabletLayout) {
                                showMobileConditionsPanel();
                              }
                            }}
                          >
                            <div className="summon-name-label">{summonName}</div>
                            <div className="summon-condition-dots">
                              {(rowData[index].summonConditions?.[summonName] || []).map((condition, condIdx) => (
                                <span
                                  key={`${summonName}-dot-${condIdx}`}
                                  className="summon-condition-dot"
                                  style={{
                                    backgroundColor: getConditionBackgroundColor(condition)
                                  }}
                                />
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div
                    className="personal-conditions"
                    onClick={(e) => {
                      e.stopPropagation();

                      if (overlayActive[index]) {
                        return;
                      }

                      updateViewCharacterIndex(shiftedIndex);
                      showMobileConditionsPanel();
                    }}
                  >
                    {personalConditionEntries.length > 0
                      ? personalConditionEntries.map((conditionEntry) => (
                        <div
                          key={conditionEntry.key}
                          className="condition-section"
                          style={{
                            backgroundColor: getConditionBackgroundColor(conditionEntry),
                            color: 'black',
                          }}
                        >
                          {conditionEntry.displayText}
                        </div>
                      ))
                      : '[No Conditions]'}
                  </div>
                </div>
              )})}
            </div>
          </div>

          <div className="conditions-list">
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-top-left" />
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-top-right" />
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-bottom-left" />
            <img src={cornerBorder} alt="Corner Border" className="corner-border-image corner-bottom-right" />
            {/* Banner */}
            <div className="conditions-list-banner">
                <div className="conditions-list-header">
                    Conditions</div>
                <div className="conditions-banner-button">
                    <button className="add-condition-button" onClick={handleAddConditionClick}>
                    </button>
                </div>
            </div>

            {/* Rows */}
            <div className="conditions-list-content"
              style={{
                backgroundColor: viewCharacterIndex !== null ? 'var(--view-character-background-color)' : '',
                backgroundImage: viewCharacterIndex !== null ? 'var(--view-character-background-image)' : ''
              }}
            >
              {viewCharacterIndex !== null &&
                displayedSortedRowData[viewCharacterIndex] &&
                rowData[displayedSortedRowData[viewCharacterIndex].index] ? (
                  <>
                  {isViewingEnemyIndividual(displayedSortedRowData[viewCharacterIndex].index) && (
                    <div className="conditions-row individual-enemy-action-row">
                      <div className="condition-description">
                        <div>
                          <strong>Click this button to delete this individual enemy:</strong>
                        </div>
                      </div>
                      <div className="condition-expiration individual-enemy-action-cell">
                        <button
                          type="button"
                          className="individual-enemy-delete-button"
                          onClick={() => deleteViewedIndividualEnemy(displayedSortedRowData[viewCharacterIndex].index)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  {renderConditionRows(displayedSortedRowData[viewCharacterIndex].index)}
                </>
                ) : null
              }
              {shiftedRowIndex !== null &&
                viewCharacterIndex === null &&
                displayedSortedRowData[0] &&
                rowData[displayedSortedRowData[0].index] &&
                hasConditionsToRender(displayedSortedRowData[0].index) ? (
                  <>
                  {isViewingEnemyIndividual(displayedSortedRowData[0].index) && (
                    <div className="conditions-row individual-enemy-action-row">
                      <div className="condition-description">
                        <div>
                          <strong>Click this button to delete this individual enemy:</strong>
                        </div>
                      </div>
                      <div className="condition-expiration individual-enemy-action-cell">
                        <button
                          type="button"
                          className="individual-enemy-delete-button"
                          onClick={() => deleteViewedIndividualEnemy(displayedSortedRowData[0].index)}
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                  {renderConditionRows(displayedSortedRowData[0].index)}
                  </>
                ) : null
              }
            </div>
            </div>
        </div>

        <div className="mobile-page-change">
          <div className="right-show-conditions" onClick={showMobileConditionsPanel}>
            View Conditions &rarr;
          </div>
          <div className="left-show-initiative" onClick={showMobileInitiativePanel}>
            &larr; View Initiatives
          </div>
        </div>

        {isTutorialModalOpen && !isGuidedTutorialModalOpen && (
          <div className="modal-overlay tutorial-modal-overlay">
            <div className="tutorial-modal">
              <button
                type="button"
                className="close-modal-button"
                onClick={() => setIsTutorialModalOpen(false)}
                aria-label="Close Tutorial"
              >
                X
              </button>
              <div className="tutorial-modal-wrapper">
                <h2 className="tutorial-modal-title">
                  Free D&amp;D 5e Initiative Tracker (Fast, Clean, No Login)
                </h2>

                <p className="tutorial-modal-intro-text">
                  This is a <strong>free D&amp;D 5e initiative tracker</strong> built for Dungeon Masters and players
                  who want combat to move quickly and stay readable. Track turn order, rounds, conditions, and
                  concentration during live playΓÇöwithout spreadsheets, clutter, or account setup.
                </p>

                <p className="tutorial-modal-intro-text-large">
                  Unlike many initiative trackers built only for the DM, this tracker is designed to be shared.
                  Whether youΓÇÖre casting it to a TV at the table or screen-sharing during a remote session,
                  everyone can see the turn order, conditions, and flow of combat at a glance.
                </p>

                <p className="tutorial-modal-intro-text-large">
                  If youΓÇÖre playing D&amp;D 5e, this will feel immediately familiar. If youΓÇÖre playing another system, it
                  still works great for tracking turn order, conditions, and combat flow.
                </p>

                <AdSlot />

                <div className="tutorial-modal-top">
                  <div className="tutorial-modal-top-left">
                    <h2>How to use it</h2>
                    <ol>
                      <li>Add combatants (PCs, monsters, NPCs).</li>
                      <li>Set initiative values and sort the order.</li>
                      <li>Track turns and rounds as combat progresses.</li>
                      <li>Use conditions to keep effects visible at a glance.</li>
                    </ol>
                    <div className="guided-tutorial-button">
                      <button
                        type="button"
                        className="tutorial-modal-btn-primary"
                        onClick={() => {
                          setIsTutorialModalOpen(false);
                          setIsGuidedTutorialModalOpen(true);
                          setGuidedTutorialStep(1);
                        }}
                      >
                        Guided Tutorial
                      </button>
                    </div>
                    <h2>Why this initiative tracker exists</h2>
                    <ul>
                      <li><strong>Speed:</strong> fewer clicks, less setup, more playing.</li>
                      <li><strong>Clarity:</strong> turn order and key info stays readable.</li>
                      <li><strong>Focus:</strong> you should be running a sceneΓÇönot managing a spreadsheet.</li>
                      <li><strong>Shared clarity:</strong> <strong>Shared visibility:</strong> designed to be readable by the whole table, not just the DM.</li>
                    </ul>
                  </div>
                  <div className="tutorial-modal-top-right">
                    <h2>FAQ</h2>

                    <div className="tutorial-modal-faq-section">
                      <div>
                        <p className="tutorial-modal-faq-item">What is an initiative tracker in D&amp;D 5e?</p>
                        <p>
                          An initiative tracker helps Dungeon Masters track turn order during combat.
                          This tool keeps initiative, rounds, and conditions visible so combat flows smoothly.
                        </p>
                      </div>

                      <div>
                        <p className="tutorial-modal-faq-item">Is this free?</p>
                        <p>
                          Yes. The Initiative Tracker is free to use. Over time weΓÇÖll add more tools and optional upgrades,
                          but the goal is always: useful first.
                        </p>
                      </div>

                      <div>
                        <p className="tutorial-modal-faq-item">Does it work for D&amp;D 5e?</p>
                        <p>
                          Yep. ItΓÇÖs built with D&amp;D 5e flow in mind, but it works for any tabletop system with initiative /
                          turn order.
                        </p>
                      </div>

                      <div>
                        <p className="tutorial-modal-faq-item">Do I need an account?</p>
                        <p>
                          No account required. (If we add accounts/cloud sync later, it will be optional and clearly
                          explained.)
                        </p>
                      </div>

                      <div>
                        <p className="tutorial-modal-faq-item">Where can I send feedback?</p>
                        <p>
                          Email us from the address listed on the{' '}
                          <Link to="/about" className="tutorial-modal-faq-link">
                            About page
                          </Link>
                          .
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
        {isGuidedTutorialModalOpen && (
          <div
            className={`modal-overlay guided-tutorial-modal-overlay ${(guidedTutorialStep === 8 || guidedTutorialStep === 10) ? 'guided-tutorial-modal-overlay--shift-left' : ''}`}
            style={guidedTutorialSpotlights.length ? { background: 'transparent' } : undefined}
          >
            {guidedTutorialSpotlights.map((spot, index) => (
              <div
                key={`${spot.shape}-${index}`}
                className={`guided-tutorial-spotlight guided-tutorial-spotlight--${spot.shape}`}
                style={{
                  left: spot.x,
                  top: spot.y,
                  width: spot.width,
                  height: spot.height
                }}
              />
            ))}
            <div className="guided-tutorial-modal">
              <button
                type="button"
                className="guided-tutorial-close-button"
                onClick={() => setIsGuidedTutorialModalOpen(false)}
                aria-label="Close Guided Tutorial"
              >
                X
              </button>
              <div className="guided-tutorial-content">
                <h2 className="guided-tutorial-title">
                  Guided Tutorial - Step {guidedTutorialStep} of {guidedTutorialSteps.length}
                </h2>
                <p className="guided-tutorial-text">
                  {guidedTutorialSteps[guidedTutorialStep - 1]}
                </p>
                <div className="guided-tutorial-actions">
                  <button
                    type="button"
                    className="guided-tutorial-back-btn"
                    aria-label="Guided tutorial back"
                    onClick={() => setGuidedTutorialStep((step) => Math.max(1, step - 1))}
                    disabled={guidedTutorialStep === 1}
                    style={{ visibility: guidedTutorialStep === 1 ? 'hidden' : 'visible' }}
                  >
                  </button>
                  <button
                    type="button"
                    className="guided-tutorial-next-btn"
                    aria-label="Guided tutorial next"
                    onClick={() => setGuidedTutorialStep((step) => Math.min(guidedTutorialSteps.length, step + 1))}
                    disabled={guidedTutorialStep === guidedTutorialSteps.length}
                    style={{ visibility: guidedTutorialStep === guidedTutorialSteps.length ? 'hidden' : 'visible' }}
                  >
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>

    <ToolPageFooter
      helpHidden={helpHidden}
      showHelp={showHelp}
      learnMoreOpen={learnMoreOpen}
      setLearnMoreOpen={setLearnMoreOpen}
      contentKey="initiative"
      hideAd
    />

        {/* Add-Character Modal */}
      {isModalOpen !== null && (
        <div className="modal-overlay add-character-modal" onClick={handleCloseModal}>
          <div className="add-character-modal-layout" onClick={(e) => e.stopPropagation()}>
            <div className="modal">
              <h2>Add New Character</h2>
              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label htmlFor="character-name">Character Name</label>
                  <input
                    type="text"
                    id="character-name"
                    name="characterName"
                    className="form-input"
                    value={characterName}
                    onChange={(e) => setCharacterName(e.target.value)}
                    placeholder="Enter character name"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Affiliation</label>
                  <div className="radio-group">
                    {['Player Character', 'Enemy', 'Ally', 'Neutral/Environmental'].map((type) => (
                      <label key={type}>
                        <input
                          type="radio"
                          name="affiliation"
                          value={type}
                          checked={affiliation === type}
                          onChange={(e) => {
                            setAffiliation(e.target.value);
                            if (e.target.value !== 'Player Character') {
                              setAddSummons(false);
                              setSummonNames(['']);
                            }
                            if (!supportsGroupedIndividuals(e.target.value)) {
                              setMultipleEnemiesType(false);
                              setEnemyTypeCount('');
                              setEnemyCountExceededLimit(false);
                              setNameIndividualEnemies(false);
                              setEnemyIndividualNames([]);
                            }
                            setMobileCharacterDetailModal(null);
                            setMobileEnemyModalStep('setup');
                          }}
                        />
                        {type}
                      </label>
                    ))}
                  </div>
                </div>
                {affiliation === 'Player Character' && (
                  <div className="accordion-panel">
                    {isMobileLayout && mobileSummonsConfirmed ? (
                      <div className="mobile-character-summary">
                        <span className="mobile-character-summary-label">Added: </span>
                        <span className="mobile-character-summary-value">
                          {summonNames
                            .map((name) => name.trim())
                            .filter(Boolean)
                            .join(', ')}
                        </span>
                      </div>
                    ) : (
                      <label className="accordion-label">
                        <input
                          type="checkbox"
                          checked={addSummons}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setAddSummons(checked);
                            if (!checked) {
                              setSummonNames(['']);
                              setMobileSummonsConfirmed(false);
                            }
                            if (isMobileLayout) {
                              setMobileCharacterDetailModal(checked ? 'summons' : null);
                            }
                          }}
                          className="accordion-checkbox"
                        />
                        Add Summons?
                      </label>
                    )}
                  </div>
                )}
                {supportsGroupedIndividuals(affiliation) && (
                  <div className="accordion-panel">
                    {isMobileLayout && mobileEnemiesConfirmed ? (
                      <div className="mobile-character-summary">
                        <span className="mobile-character-summary-label">Added:</span>
                        <span className="mobile-character-summary-value">
                          {nameIndividualEnemies
                            ? (() => {
                                const namedEnemies = enemyIndividualNames
                                  .map((name) => name.trim())
                                  .filter(Boolean);
                                if (namedEnemies.length > 0) {
                                  return namedEnemies.join(', ');
                                }
                                return `${enemyTypeCount || 0} characters of this type`;
                              })()
                            : `${enemyTypeCount || 0} characters of this type`}
                        </span>
                      </div>
                    ) : (
                      <label className="accordion-label">
                        <input
                          type="checkbox"
                          checked={multipleEnemiesType}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setMultipleEnemiesType(checked);
                            if (!checked) {
                              setEnemyTypeCount('');
                              setEnemyCountExceededLimit(false);
                              setNameIndividualEnemies(false);
                              setEnemyIndividualNames([]);
                              setMobileEnemiesConfirmed(false);
                            }
                            if (isMobileLayout) {
                              setMobileCharacterDetailModal(checked ? 'enemies' : null);
                              setMobileEnemyModalStep('setup');
                            }
                          }}
                          className="accordion-checkbox"
                        />
                        Multiple Characters of this Type?
                      </label>
                    )}
                  </div>
                )}
                {errorMessage && <p className="error-message">{errorMessage}</p>}
                <div className="modal-button-group">
                  <button type="button" className="close-modal-button" onClick={handleCloseModal}>
                    X
                  </button>
                  <button type="submit" className="submit-button">
                    Submit
                  </button>
                </div>
              </form>
            </div>

            {!isMobileLayout && affiliation === 'Player Character' && addSummons && (
              <div className="summons-side-panel">
                <h3>Name Your Summons</h3>
                <div className="summons-input-list">
                  {summonNames.map((name, index) => (
                    <div key={`summon-name-${index}`} className="summons-input-row">
                      <input
                        type="text"
                        className="summons-input"
                        placeholder="Name of Summon"
                        value={name}
                        ref={(el) => {
                          summonInputRefs.current[index] = el;
                        }}
                        onChange={(e) => handleSummonNameChange(index, e.target.value)}
                        onBlur={() => {
                          if (!isTabletLayout) {
                            promoteNextSummonInput(index);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (isTabletLayout && e.key === 'Enter') {
                            e.preventDefault();
                            return;
                          }

                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleSummonEnter(index);
                          }
                        }}
                      />
                      <button
                        type="button"
                        className="summons-remove-button"
                        aria-label={`Remove summon input ${index + 1}`}
                        onClick={() => removeSummonInput(index)}
                      >
                        X
                      </button>
                    </div>
                  ))}
                  {!isTabletLayout && summonNames.length < 10 && (
                    <button
                      type="button"
                      className="summons-add-text-button"
                      onClick={addSummonInput}
                    >
                      Add Summon
                    </button>
                  )}
                </div>
                {isTabletLayout && summonNames.length < 10 && (
                  <button
                    type="button"
                    className="summons-add-button"
                    aria-label="Add summon input"
                    onClick={addSummonInput}
                  >
                    <img src={plusIcon} alt="Add summon input" />
                  </button>
                )}
                {summonNames.length >= 10 && (
                  <p className="summons-limit-message">
                    You can only have a maximum of 10 summons at a time.
                  </p>
                )}
              </div>
            )}

            {!isMobileLayout && supportsGroupedIndividuals(affiliation) && multipleEnemiesType && (
              <div className="summons-side-panel">
                <h3>Input the number of this character type:</h3>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="summons-input enemy-count-input"
                  value={enemyTypeCount}
                  onChange={(e) => {
                    const numericOnly = e.target.value.replace(/\D/g, '');
                    if (numericOnly === '') {
                      setEnemyTypeCount('');
                      setEnemyCountExceededLimit(false);
                      return;
                    }

                    const parsed = Number.parseInt(numericOnly, 10);
                    if (parsed > 30) {
                      setEnemyTypeCount('30');
                      setEnemyCountExceededLimit(true);
                    } else {
                      setEnemyTypeCount(String(parsed));
                      setEnemyCountExceededLimit(false);
                    }
                  }}
                  placeholder="0"
                />
                {enemyCountExceededLimit && (
                  <div className="enemy-count-limit-message">
                    You can only have a maximum of 30 characters of this type
                  </div>
                )}

                <label className="accordion-label enemy-naming-checkbox">
                  <input
                    type="checkbox"
                    checked={nameIndividualEnemies}
                    onChange={(e) => {
                      setNameIndividualEnemies(e.target.checked);
                      if (!e.target.checked) {
                        setEnemyIndividualNames([]);
                      }
                    }}
                    className="accordion-checkbox"
                  />
                  Name Individual Characters of this Type?
                </label>

                {nameIndividualEnemies && (
                  <div className="summons-input-list enemy-input-list">
                    {Array.from({
                      length: Number.isFinite(Number.parseInt(enemyTypeCount, 10))
                        ? Math.min(Math.max(Number.parseInt(enemyTypeCount, 10), 0), 30)
                        : 0
                    }).map((_, index) => (
                      <input
                        key={`enemy-name-${index}`}
                        type="text"
                        className="summons-input"
                        placeholder={`${affiliation || 'Character'} ${index + 1} Name`}
                        value={enemyIndividualNames[index] || ''}
                        ref={(el) => {
                          enemyNameInputRefs.current[index] = el;
                        }}
                        onChange={(e) => {
                          const nextValue = e.target.value;
                          setEnemyIndividualNames((prev) => {
                            const updated = [...prev];
                            updated[index] = nextValue;
                            return updated;
                          });
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleEnemyNameEnter(index);
                          }
                        }}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {isMobileLayout && mobileCharacterDetailModal === 'summons' && affiliation === 'Player Character' && addSummons && (
              <div className="mobile-character-detail-overlay">
                <div className="summons-side-panel mobile-character-detail-modal">
                  <h3>Name Your Summons</h3>
                  <div className="summons-input-list">
                    {summonNames.map((name, index) => (
                      <div key={`summon-name-${index}`} className="summons-input-row">
                        <input
                          type="text"
                          className="summons-input"
                          placeholder="Name of Summon"
                          value={name}
                          ref={(el) => {
                            summonInputRefs.current[index] = el;
                          }}
                          onChange={(e) => handleSummonNameChange(index, e.target.value)}
                          onBlur={() => {
                            if (!isTabletLayout) {
                              promoteNextSummonInput(index);
                            }
                          }}
                          onKeyDown={(e) => {
                            if (isTabletLayout && e.key === 'Enter') {
                              e.preventDefault();
                              return;
                            }

                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleSummonEnter(index);
                            }
                          }}
                        />
                        <button
                          type="button"
                          className="summons-remove-button"
                          aria-label={`Remove summon input ${index + 1}`}
                          onClick={() => removeSummonInput(index)}
                        >
                          X
                        </button>
                      </div>
                    ))}
                      {isTabletLayout && summonNames.length < 10 && (
                        <button
                          type="button"
                          className="summons-add-button"
                          aria-label="Add summon input"
                          onClick={addSummonInput}
                        >
                          <img src={plusIcon} alt="Add summon input" />
                        </button>
                      )}
                  </div>
                  {summonNames.length >= 10 && (
                    <p className="summons-limit-message">
                      You can only have a maximum of 10 summons at a time.
                    </p>
                  )}
                  <div className="mobile-character-detail-actions">
                    <button
                      type="button"
                      className="mobile-character-detail-back-button"
                      onClick={handleBackFromSummonsModal}
                    >
                      Back
                    </button>
                    <button
                      type="button"
                      className="submit-button mobile-character-detail-submit-button"
                      onClick={handleCloseMobileCharacterDetailModal}
                    >
                      Submit
                    </button>
                  </div>
                </div>
              </div>
            )}

            {isMobileLayout && mobileCharacterDetailModal === 'enemies' && supportsGroupedIndividuals(affiliation) && multipleEnemiesType && (
              <div className="mobile-character-detail-overlay">
                <div className="summons-side-panel mobile-character-detail-modal">
                  {mobileEnemyModalStep === 'setup' ? (
                    <>
                      <h3>Input the number of this character type:</h3>
                      <input
                        type="number"
                        min="1"
                        max="30"
                        className="summons-input enemy-count-input"
                        value={enemyTypeCount}
                        onChange={(e) => {
                          const numericOnly = e.target.value.replace(/\D/g, '');
                          if (numericOnly === '') {
                            setEnemyTypeCount('');
                            setEnemyCountExceededLimit(false);
                            return;
                          }

                          const parsed = Number.parseInt(numericOnly, 10);
                          if (parsed > 30) {
                            setEnemyTypeCount('30');
                            setEnemyCountExceededLimit(true);
                          } else {
                            setEnemyTypeCount(String(parsed));
                            setEnemyCountExceededLimit(false);
                          }
                        }}
                        placeholder="0"
                      />
                      {enemyCountExceededLimit && (
                        <div className="enemy-count-limit-message">
                          You can only have a maximum of 30 characters of this type
                        </div>
                      )}

                      <label className="accordion-label enemy-naming-checkbox">
                        <input
                          type="checkbox"
                          checked={nameIndividualEnemies}
                          onChange={(e) => {
                            const checked = e.target.checked;
                            setNameIndividualEnemies(checked);
                            if (!checked) {
                              setEnemyIndividualNames([]);
                            }
                          }}
                          className="accordion-checkbox"
                        />
                        Name Individual Characters of this Type?
                      </label>

                      <div className="mobile-character-detail-actions">
                        <button
                          type="button"
                          className="mobile-character-detail-back-button"
                          onClick={handleBackFromEnemiesModal}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          className="submit-button mobile-character-detail-submit-button"
                          onClick={handleSubmitMobileEnemiesModal}
                        >
                          Submit
                        </button>
                      </div>
                    </>
                  ) : (
                    <>
                      <h3>Name Individual Characters of this Type</h3>
                      <div className="summons-input-list enemy-input-list">
                        {(enemyIndividualNames.length > 0 ? enemyIndividualNames : ['']).map((enemyName, index) => (
                          <div key={`enemy-name-${index}`} className="summons-input-row">
                            <input
                              type="text"
                              className="summons-input"
                              placeholder={`${affiliation || 'Character'} ${index + 1} Name`}
                              value={enemyName || ''}
                              ref={(el) => {
                                enemyNameInputRefs.current[index] = el;
                              }}
                              onChange={(e) => handleEnemyIndividualNameChange(index, e.target.value)}
                              onBlur={() => promoteNextEnemyInput(index)}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleEnemyNameEnter(index);
                                }
                              }}
                            />
                            <button
                              type="button"
                              className="summons-remove-button"
                              aria-label={`Remove enemy input ${index + 1}`}
                              onClick={() => removeEnemyIndividualInput(index)}
                            >
                              X
                            </button>
                          </div>
                        ))}
                      </div>

                      <div className="mobile-character-detail-actions">
                        <button
                          type="button"
                          className="mobile-character-detail-back-button"
                          onClick={handleBackFromEnemyNamesModal}
                        >
                          Back
                        </button>
                        <button
                          type="button"
                          className="submit-button mobile-character-detail-submit-button"
                          onClick={handleSubmitMobileEnemiesModal}
                        >
                          Submit
                        </button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

{deleteConfirmIndex !== null && (
  <div className="modal-overlay delete-confirm-modal" onClick={() => setDeleteConfirmIndex(null)}>
    <div className="modal" onClick={(e) => e.stopPropagation()}>
      <p>
        Are you sure you want to delete{' '}
        <span style={{ color: 'red' }}>
          {rowData[deleteConfirmIndex]?.name || 'this character'}
        </span>
        ?<br></br> This action cannot be undone.
      </p>
      <div className="character-delete-modal-button-group">
        <button
          className="character-delete-cancel-button"
          onClick={() => setDeleteConfirmIndex(null)}
        >
          Cancel
        </button>
        <button
          className="character-delete-submit-button"
          onClick={() => {
            let updatedData = [...rowData];
            let updatedVisibility = [...rowVisibility];
            let updatedOverlay = [...overlayActive];

            updatedData.splice(deleteConfirmIndex, 1);
            updatedVisibility.splice(deleteConfirmIndex, 1);
            updatedOverlay.splice(deleteConfirmIndex, 1);

            // Only add a new empty row if:
            // - There are fewer than 20 rows
            // - There is NOT already an empty row (row with no name)
            // const hasEmptyRow = updatedData.some(row => !row.name);
            // if (updatedData.length < 20 && !hasEmptyRow) {
              updatedData.push({ name: '', affiliation: '', initiative: null, conditions: [] });
              updatedVisibility.push(updatedData[updatedData.length - 2].name !== '' ? true : false); // or false, depending on your logic
              updatedOverlay.push(updatedData[updatedData.length - 2].name !== '' ? true : false);    // show the add-character button
            // }

            setRowData(updatedData);
            setRowVisibility(updatedVisibility);
            setOverlayActive(updatedOverlay);

            setDeleteConfirmIndex(null);
            setOpenMenuIndex(null);
          }}
        >
          Proceed
        </button>
      </div>
    </div>
  </div>
)}

{/* Add-Condition Modal */}
{isAddConditionModalOpen !== null && (
  <div className="modal-overlay">
    <div className="dual-modal-wrapper" style={{marginLeft: isCustomConditionModalOpen ? '255px' : '0'}}>
      <div className={`condition-modal ${isCustomConditionModalOpen ? 'custom-modal-open-width' : 'custom-modal-closed-width'}`}>
        <div className="condition-modal-header">
          <h2>Add Condition</h2>
          <span
            className="tooltip"
            onMouseEnter={() => {
              document.getElementsByClassName('tooltiptext')[0].style.visibility = 'visible';
            }}
            onMouseLeave={() => {
              document.getElementsByClassName('tooltiptext')[0].style.visibility = 'hidden';
            }}
          >
            <img src={infoIcon} alt="More information" />
            <span className='tooltiptext'>These Conditions use the 2024 Dungeons and Dragons Rules</span>
          </span>
        </div>
        {isAddConditionMobileLayout && (
          <button
            type="button"
            className="mobile-add-condition-close-button"
            onClick={handleCloseAddConditionModal}
            aria-label="Close Add Condition"
          >
            X
          </button>
        )}
        {isAddConditionMobileLayout && mobileAddConditionStep >= 2 && selectedConditionTargetLabels.length > 0 && (
          <div className="condition-mobile-apply-summary">
            <span>Apply to:</span> {selectedConditionTargetLabels.join(', ')}
          </div>
        )}
        {isAddConditionMobileLayout && mobileAddConditionStep >= 3 && selectedConditionLabels.length > 0 && (
          <div className="condition-mobile-apply-summary">
            <span>Conditions:</span> {selectedConditionLabels.join(', ')}
          </div>
        )}
        {isAddConditionMobileLayout && mobileAddConditionStep >= 2 && (
          <div className="condition-mobile-step-actions">
            <button type="button" className="submit-button" onClick={handleMobileConditionStepBack}>Back</button>
          </div>
        )}
        <form onSubmit={handleAddConditionSubmit} className="add-condition-form">
          {/* Choose Condition(s) Section */}
          <div className="characters-conditions">
          {(!isAddConditionMobileLayout || showMobileTargetStep) && (
          <div className="characters-section">
            <div className="form-group conditions-form-group">
              <label htmlFor="characters">Apply to:</label>
              <div className="characters-checkbox-group">
                <div className="characters-conditions-list">
                  {conditionTargets.map((target) => (
                      <div
                        key={target.id}
                        className={`selectable-item${selectedCharacters.includes(target.id) ? ' selected' : ''}${target.isSummon ? ' summon-target-item' : ''}`}
                        onClick={() => handleCharacterClick(target.id)}
                      >
                        {target.label}
                      </div>
                    ))}
                </div>
                <div className="mobile-characters-dropdown">
                  <select multiple value={selectedCharacters} onChange={handleMobileCharacterSelectChange}>
                    {conditionTargets.map((target) => (
                      <option key={target.id} value={target.id} >
                        {target.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {isAddConditionMobileLayout && showMobileTargetStep && (
                <div className="condition-mobile-step-actions">
                  <button
                    type="button"
                    className="submit-button"
                    onClick={() => setMobileAddConditionStep(2)}
                    disabled={selectedCharacters.length < 1}
                  >
                    Next
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
          {(!isAddConditionMobileLayout || showMobileConditionStep) && (
          <div className="conditions-section">
            <div className="form-group conditions-form-group">
              <div className="conditions-label-row">
                <label htmlFor="conditions">Choose Condition(s):</label>
                {isTabletLayout && (
                  <button
                    type="button"
                    className="submit-button add-con-inline-custom"
                    onClick={() => setMobCustomOpen(true)}
                  >
                    Custom
                  </button>
                )}
              </div>
              <div className="conditions-checkbox-group">
                {[
                  'Blinded', 'Charmed', 'Deafened', 'Frightened', 'Grappled', 'Incapacitated',
                  'Invisible', 'Paralyzed', 'Petrified', 'Poisoned', 'Prone', 'Restrained',
                  'Stunned', 'Unconscious', 'Exhaustion1', 'Exhaustion2', 'Exhaustion3',
                  'Exhaustion4', 'Exhaustion5', 'Exhaustion6', 'Other1', 'Other2', 'Other3', 'Other4', '(Custom)'
                ].map((condition) => (
                  <div
                    key={condition}
                    className={`selectable-item${selectedConditions.includes(condition) ? ' selected' : ''}`}
                    onClick={() => {
                      handleConditionClick(condition);

                      if (condition === '(Custom)') {
                        if (selectedConditions.includes('(Custom)')) {
                          // If already selected, clicking again deselects it ΓÇö so close the modal
                          setIsCustomConditionModalOpen(false);
                        } else {
                          // If not selected, clicking selects it ΓÇö so open the modal
                          setIsCustomConditionModalOpen(true);
                        }
                      }
                    }}

                  >
                    {condition}
                  </div>
                ))}
              </div>
              <div className="conditions-dropwdown-list">
                <select multiple value={selectedConditions} onChange={handleMobileConditionSelectChange}>
                  {getOriginalAndCustomConditions().map((condition) => (
                    <option key={condition} value={condition} >
                      {condition}
                    </option>
                  ))}
                </select>
              </div>
              {isAddConditionMobileLayout && showMobileConditionStep && (
                <div className="condition-mobile-step-actions">
                  {!isTabletLayout && (
                    <button
                      type="button"
                      className="submit-button"
                      onClick={() => setMobCustomOpen(true)}
                    >
                      Custom
                    </button>
                  )}
                  <button
                    type="button"
                    className="submit-button"
                    onClick={() => setMobileAddConditionStep(3)}
                    disabled={selectedConditions.length < 1}
                  >
                    Continue
                  </button>
                </div>
              )}
            </div>
          </div>
          )}
          </div>
            {(!isAddConditionMobileLayout || showMobileExpirationStep) && (
              <>
            <div className="condition-expiration-selection">
              <label htmlFor="condition-expiration-timing" className="condition-expiration-label">
                Condition Expiration:
              </label>
              <select
                id="condition-expiration-timing"
                className="condition-expiration-dropdown"
                value={expirationTiming}
                onChange={e => {
                  setExpirationTiming(e.target.value);
                  setExpirationType("");
                  setExpirationTarget("");
                  setExpirationRound(""); // Reset fourth dropdown
                }}
              >
                <option value="unknown">NA / Unknown</option>
                <option>At the beginning of</option>
                <option>Just before</option>
                <option>Just after</option>
                <option>At the end of</option>
              </select>
              <select
                className="condition-expiration-dropdown"
                value={expirationType}
                onChange={e => {
                  setExpirationType(e.target.value);
                  setExpirationTarget("");
                  setExpirationRound(""); // Reset fourth dropdown
                }}
                disabled={expirationTiming === "unknown"}
              >
                {expirationTiming !== "unknown" && (
                  <>
                    <option value="">-- Select --</option>
                    <option value="round">Round</option>
                    <option value="character">Character's Turn:</option>
                  </>
                )}
              </select>
              <select
                className="condition-expiration-dropdown"
                value={expirationTarget}
                onChange={e => setExpirationTarget(e.target.value)}
                disabled={expirationTiming === "unknown" || !expirationType}
              >
                {expirationTiming !== "unknown" && expirationType === "round" &&
                  <>
                    (
                      <option value="">--Select Round--</option>
                    )
                    {
                      [...Array(10)].map((_, i) => (
                        <option key={i} value={round + i}>
                          {round + i}
                        </option>
                      ))
                    }
                  </>
                }
                {expirationTiming !== "unknown" && expirationType === "character" &&
                  <>
                    <option value="">--Select Character--</option>
                    {
                      sortedRowData
                        .filter(row => row.name && !overlayActive[row.index])
                        .map(row => row.name)
                        .sort((a, b) => a.localeCompare(b))
                        .map(name => (
                          <option key={name} value={name}>
                            {name}
                          </option>
                        ))
                    }
                  </>
                }
              </select>
              {expirationTiming !== "unknown" && expirationType === "character" && (
                <select
                  className="condition-expiration-dropdown"
                  value={expirationRound}
                  onChange={e => setExpirationRound(e.target.value)}
                >
                  <option value="">--Select Round--</option>
                  {[...Array(10)].map((_, i) => (
                    <option key={i} value={round + i}>
                      On Round {round + i}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <div>
              {
                toggleAddConditionEnforcementMessage && (
                  <h3 style={{color: "red"}}>Please ensure all fields are not empty</h3>
                )
              }
            </div>
            <div className="modal-button-group">
              <div className="submit-button-container">
                <button className="submit-button">Submit</button>
              </div>
              {!isMobileLayout && !isTabletLayout && (
                <div className="submit-button-container add-con-close-container">
                  <button type="button" className="submit-button add-con-close" onClick={() => setMobCustomOpen(true)}>Custom</button>
                </div>
              )}
              <div className="submit-button-container add-con-close-container add-con-close-btn-container">
                <button type="button" className="submit-button add-con-close" onClick={handleCloseAddConditionModal}>Close</button>
              </div>
              {!isMobileLayout && (
                <button
                  type="button"
                  className="close-modal-button"
                  onClick={handleCloseAddConditionModal}
                >
                  X
                </button>
              )}
            </div>
              </>
            )}
        </form>
      </div>

      {isCustomConditionModalOpen && (
        <div className="custom-condition-modal">
          <h2>Custom Condition</h2>
            {!showCustomConditionForm ? (
                <button
                  type="button"
                  onClick={() => {
                    if (isCustomConditionMultiDeleteMode) {
                      confirmMultiDeleteCustomConditions();
                      return;
                    }
                    setShowCustomConditionForm(true);
                  }}
                  className="new-custom-condition-button"
                >
                  {isCustomConditionMultiDeleteMode
                    ? `Confirm Delete (${multiDeleteCustomConditionIndexes.length})`
                    : 'New Custom Condition'}
                </button>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  const newName = customConditionName.trim();
                  if (!newName) return;

                  if (editCustomConditionIndex !== null) {
                    // Edit existing
                    setCustomConditions(prevConditions =>
                      prevConditions.map((cond, idx) =>
                        idx === editCustomConditionIndex
                          ? {
                              ...cond,
                              name: newName,
                              affect: customConditionAffect,
                              description: customConditionDescription,
                            }
                          : cond
                      )
                    );
                    setEditCustomConditionIndex(null);
                  } else {
                    // Add new
                    setCustomConditions(prevConditions =>
                      [...prevConditions, {
                        name: newName,
                        affect: customConditionAffect,
                        description: customConditionDescription,
                      }].sort((a, b) => a.name.localeCompare(b.name))
                    );
                    setSelectedConditions((prevSelectedConditions) =>
                      prevSelectedConditions.includes(newName)
                        ? prevSelectedConditions
                        : [...prevSelectedConditions, newName]
                    );
                  }

                  setConditionDescriptions({...conditionDescriptions, [newName]: customConditionDescription});
                  setConditionColors({...conditionColors, [newName]: getMappedColorType(customConditionAffect)});

                  setShowCustomConditionForm(false);
                  setCustomConditionName('');
                  setCustomConditionAffect('');
                  setCustomConditionDescription('');
                }}
              >
                <div className="form-group">
                  <label>Name</label>
                  <textarea
                    name="customConditionName"
                    value={customConditionName}
                    onChange={(e) => setCustomConditionName(e.target.value)}
                    rows={1}
                  />
                </div>

                <div className="form-group">
                  <label>Affect</label>
                  <div className="affect-buttons">
                    {['Positive', 'Neutral', 'Negative'].map((type) => (
                      <button
                        type="button"
                        key={type}
                        className={`${customConditionAffect === type ? 'selected' : ''} ${type.toLowerCase()}`}
                        onClick={() => setCustomConditionAffect(type)}
                      >
                        {type}
                      </button>
                    ))}

                  </div>
                </div>

                <div className="form-group">
                  <label>Description</label>
                  <textarea
                    name="customConditionDescription"
                    value={customConditionDescription}
                    onChange={(e) => setCustomConditionDescription(e.target.value)}
                    rows={3}
                  />
                </div>

                <div className="modal-button-group">
                  <button type="submit">{editCustomConditionIndex !== null ? 'Save' : (isMobileLayout ? 'Add' : 'Add Condition')}</button>
                  {editCustomConditionIndex !== null && (
                    <button
                      type="button"
                      onClick={() => requestDeleteCustomCondition(editCustomConditionIndex, customConditionName)}
                    >
                      Delete
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      setShowCustomConditionForm(false);
                      setCustomConditionName('');
                      setCustomConditionAffect('');
                      setCustomConditionDescription('');
                      setEditCustomConditionIndex(null); // Reset edit state
                    }}
                  >
                    Cancel
                  </button>

                </div>
              </form>
              )}
              <div className="custom-condition-content">
              {!showCustomConditionForm && (
                <div className="custom-condition-list">
                  {customConditions.length > 0 ? (
                    customConditions.map((condition, index) => {
                      const isConditionSelected = selectedConditions.includes(condition.name);

                      return (
                        <div
                          key={index}
                          className={`custom-condition-item selectable-item ${condition.affect?.toLowerCase()}${isConditionSelected ? ' selected' : ''}`}
                        >
                          {!isCustomConditionMultiDeleteMode && (
                            <button
                              type="button"
                              className="remove-condition-button"
                              onClick={() => requestDeleteCustomCondition(index, condition.name)}
                              aria-label={`Delete custom condition ${condition.name}`}
                            >
                              <img src={trashcanIcon} alt="Delete" className="condition-icon" />
                            </button>
                          )}
                          {isCustomConditionMultiDeleteMode ? (
                            <input
                              type="checkbox"
                              className="edit-custom-condition-checkbox"
                              checked={multiDeleteCustomConditionIndexes.includes(index)}
                              onChange={() => toggleCustomConditionMultiDeleteSelection(index)}
                              aria-label={`Select custom condition ${condition.name} for deletion`}
                            />
                          ) : (
                            <button
                              type="button"
                              className="edit-custom-condition"
                              onClick={() => {
                                setCustomConditionName(condition.name);
                                setCustomConditionAffect(condition.affect);
                                setCustomConditionDescription(condition.description);
                                setShowCustomConditionForm(true);
                                setEditCustomConditionIndex(index);
                              }}
                              aria-label={`Edit custom condition ${condition.name}`}
                            >
                              <img src={pencilIcon} alt="Edit" className="condition-icon" />
                            </button>
                          )}
                          <button
                            type="button"
                            className="custom-condition-name-button"
                            onClick={() => {
                              if (isCustomConditionMultiDeleteMode) {
                                return;
                              }
                              handleConditionClick(condition.name);
                            }}
                            disabled={isCustomConditionMultiDeleteMode}
                          >
                            {condition.name}
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <p className="no-custom-conditions">No custom conditions added yet.</p>
                  )}
                </div>
              )}
          </div>
          {pendingCustomConditionDelete && (
            <div className="custom-delete-confirm-overlay" role="dialog" aria-modal="true" aria-label="Delete custom condition confirmation">
              <div className="custom-delete-confirm-modal">
                <p>Are you sure?</p>
                <div className="custom-delete-confirm-actions">
                  <button type="button" onClick={confirmSingleCustomConditionDelete}>Yes</button>
                  <button type="button" onClick={closeCustomConditionDeletePrompt}>No</button>
                  <button type="button" onClick={enterCustomConditionMultiDeleteMode}>Delete Multiple</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {mobCustomOpen && (
        <div className="custom-mob-condition-modal">
          <div className="custom-condition-modal">
            <h2 className="mob-custom-title">Custom Condition</h2>
              {!showCustomConditionForm ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (isCustomConditionMultiDeleteMode) {
                        confirmMultiDeleteCustomConditions();
                        return;
                      }
                      setShowCustomConditionForm(true);
                    }}
                    className="new-custom-condition-button"
                  >
                    {isCustomConditionMultiDeleteMode
                      ? `Confirm Delete (${multiDeleteCustomConditionIndexes.length})`
                      : 'New Custom Condition'}
                  </button>
              ) : (
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    const newName = customConditionName.trim();
                    if (!newName) return;

                    if (editCustomConditionIndex !== null) {
                      // Edit existing
                      setCustomConditions(prevConditions =>
                        prevConditions.map((cond, idx) =>
                          idx === editCustomConditionIndex
                            ? {
                                ...cond,
                                name: newName,
                                affect: customConditionAffect,
                                description: customConditionDescription,
                              }
                            : cond
                        )
                      );
                      setEditCustomConditionIndex(null);
                    } else {
                      // Add new
                      setCustomConditions(prevConditions =>
                        [...prevConditions, {
                          name: newName,
                          affect: customConditionAffect,
                          description: customConditionDescription,
                        }].sort((a, b) => a.name.localeCompare(b.name))
                      );
                      setSelectedConditions((prevSelectedConditions) =>
                        prevSelectedConditions.includes(newName)
                          ? prevSelectedConditions
                          : [...prevSelectedConditions, newName]
                      );
                    }

                    setConditionDescriptions({...conditionDescriptions, [newName]: customConditionDescription});
                    setConditionColors({...conditionColors, [newName]: getMappedColorType(customConditionAffect)});

                    setShowCustomConditionForm(false);
                    setCustomConditionName('');
                    setCustomConditionAffect('');
                    setCustomConditionDescription('');
                  }}
                >
                  <div className="form-group">
                    <label>Name</label>
                    <textarea
                      name="customConditionName"
                      value={customConditionName}
                      onChange={(e) => setCustomConditionName(e.target.value)}
                      rows={1}
                    />
                  </div>

                  <div className="form-group">
                    <label>Affect</label>
                    <div className="affect-buttons">
                      {['Positive', 'Neutral', 'Negative'].map((type) => (
                        <button
                          type="button"
                          key={type}
                          className={`${customConditionAffect === type ? 'selected' : ''} ${type.toLowerCase()}`}
                          onClick={() => setCustomConditionAffect(type)}
                        >
                          {type}
                        </button>
                      ))}

                    </div>
                  </div>

                  <div className="form-group">
                    <label>Description</label>
                    <textarea
                      name="customConditionDescription"
                      value={customConditionDescription}
                      onChange={(e) => setCustomConditionDescription(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="modal-button-group">
                    <button type="submit">{editCustomConditionIndex !== null ? 'Save' : (isMobileLayout ? 'Add' : 'Add Condition')}</button>
                    {editCustomConditionIndex !== null && (
                      <button
                        type="button"
                        onClick={() => requestDeleteCustomCondition(editCustomConditionIndex, customConditionName)}
                      >
                        Delete
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setShowCustomConditionForm(false);
                        setCustomConditionName('');
                        setCustomConditionAffect('');
                        setCustomConditionDescription('');
                        setEditCustomConditionIndex(null); // Reset edit state
                      }}
                    >
                      Cancel
                    </button>

                  </div>
                </form>
                )}
                <div className="custom-condition-content">
                {!showCustomConditionForm && (
                  <div className="custom-condition-list">
                    {customConditions.length > 0 ? (
                      customConditions.map((condition, index) => {
                        const isConditionMarkedForDelete = multiDeleteCustomConditionIndexes.includes(index);
                        return (
                          <div
                            key={index}
                            className={`custom-condition-item selectable-item ${condition.affect?.toLowerCase()}`}
                            onClick={() => {
                              if (isCustomConditionMultiDeleteMode) {
                                toggleCustomConditionMultiDeleteSelection(index);
                                return;
                              }

                              setCustomConditionName(condition.name);
                              setCustomConditionAffect(condition.affect);
                              setCustomConditionDescription(condition.description);
                              setShowCustomConditionForm(true);
                              setEditCustomConditionIndex(index);
                            }}
                          >
                            {isCustomConditionMultiDeleteMode && (
                              <input
                                type="checkbox"
                                className="edit-custom-condition-checkbox"
                                checked={isConditionMarkedForDelete}
                                onChange={() => toggleCustomConditionMultiDeleteSelection(index)}
                                onClick={(event) => event.stopPropagation()}
                                aria-label={`Select custom condition ${condition.name} for deletion`}
                              />
                            )}
                            {condition.name}
                          </div>
                        );
                      })
                    ) : (
                      <p className="no-custom-conditions">No custom conditions added yet.</p>
                    )}
                  </div>
                )}
            </div>
            {pendingCustomConditionDelete && (
              <div className="custom-delete-confirm-overlay" role="dialog" aria-modal="true" aria-label="Delete custom condition confirmation">
                <div className="custom-delete-confirm-modal">
                  <p>Are you sure?</p>
                  <div className="custom-delete-confirm-actions">
                    <button type="button" onClick={confirmSingleCustomConditionDelete}>Yes</button>
                    <button type="button" onClick={closeCustomConditionDeletePrompt}>No</button>
                    <button type="button" onClick={enterCustomConditionMultiDeleteMode}>Delete Multiple</button>
                  </div>
                </div>
              </div>
            )}
            {!(isMobileLayout && showCustomConditionForm) && (
              <button
                type="button"
                className="close-custom-modal-button"
                onClick={() => setMobCustomOpen(false)}
              >
                Close
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  </div>
)}
    </div>
  );
}

