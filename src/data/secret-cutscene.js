(function(C){
  'use strict';
  var rarity=C.data.rarities.find(function(r){return r.id==='secret';});
  // B ends at the terminal; C replaces the temporary release with collapse/resurrection.
  rarity.openingIntro={kind:'system',cutscene:'secret',milestone:'B',color:[250,250,250],background:[0,0,0],
    sections:[{id:'fakeout',ms:2400},{id:'black',ms:1600},{id:'boot',ms:6000},{id:'desktop',ms:9000},{id:'breakdown',ms:8000},{id:'stop',ms:5000},{id:'release',ms:600}],
    handoff:{flipMs:400,fadeMs:160},backdrop:{enabled:true,animated:true,exitMs:450},
    light:{ms:4000,handoffMs:3600},
    beats:[{id:'cut',ms:2400},{id:'black',ms:2400},{id:'hum',ms:3000},{id:'post',ms:4000},{id:'bootFail',ms:7300},
      {id:'desktop',ms:10000},{id:'click',key:'click:open:0',ms:11100},{id:'click',key:'click:open:1',ms:11300},
      {id:'avalanche',ms:12650},{id:'hang',ms:14700},{id:'stopScreen',ms:27000},{id:'hex',ms:31050},{id:'cardIn',ms:32600}],
    os:{name:'NorthStar OS',buffers:[[400,225],[400,225],[480,270],[640,360]],windowCaps:[12,20,40,60],
      palette:{desktop:'#0B7285',bar:'#12206B',face:'#C8C8CC',stop:'#0A2A6B',magenta:'#FF00FF',cyan:'#00FFFF',green:'#39FF14'},
      icons:['My Collection','Packs','Recycle Bin','SECRET.DAT'],years:['1999','2007','2012','2018','2022'],
      assistant:'It looks like you are trying to open a secret. Would you like help?',
      dialogs:[
        'SECRET.DAT could not be opened. Access denied. (Nice try.)',
        'A secret has occurred.',
        'cardable.exe has stopped responding.',
        'Not enough memory to hold this much rarity.',
        'This program performed an illegal operation and will be shut down. Please contact the card.',
        'Are you sure you want to see this?',
        'Save changes to reality before closing?',
        'Error 0x53454352 (SECRET). Description: found.',
        'The card you are looking for is not here. It is here.',
        'Warning: rarity buffer overflow.',
        'Send a report to the odds?',
        '0.005 %: you were not supposed to see this.',
        'Disk full. Please delete 1 coincidence.',
        'NS fatal exception 0E at 0000:5EC12E70.',
        'Network cable unplugged from universe.',
        'Task DESTINY.EXE is not responding. End task?',
        'NorthStar is searching for a solution... no solution found.'
      ],
      desktop:{clicks:[1100,1300],waves:[{ms:1600,count:1},{ms:2650,count:2},{ms:3300,count:4},{ms:4300,count:8}],
        tailMs:5300,tailStepMs:85,dialogCount:54,hangMs:4700,dragMs:4800,assistantMs:3500,safeEntranceMs:120,safeWindowsPerSecond:12},
      breakdown:{themeMs:1600,safeCrossfadeMs:800,bursts:[250,2350,4450,6550],themeBurstMs:500,artifactBurstMs:350,
        safeShakePx:3,safeShakeHz:2.5,fullShakePx:12},
      stop:{safeRebootMs:1500,safeRebootStartMs:1000,fullCycles:[{ms:1000,duration:520},{ms:1520,duration:390},{ms:1910,duration:290}],
        terminalMs:2500,hexMs:4050,commands:['> reveal --secret','permission denied','> override','> override --force'],secretHex:'53 45 43 52 45 54'}
    }};
})(window.Cardable);
