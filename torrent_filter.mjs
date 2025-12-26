
export function normalizeTitle(title) {
    if (!title) return '';
    return title.toLowerCase()
        .replace(/['":.!?,_+\-\[\]\(\)]/g, ' ') 
        .replace(/\s+/g, ' ')                  
        .trim();
}


export function parseSceneInfo(title) {
 
    const t = title.toLowerCase();
    
    let season = null;
    let episode = null;
    let isMultiEpisode = false;
    let isSeasonPack = false;
    let isMultiSeason = false;
    let matchIndex = -1;


    if (/s(\d+)\s*-\s*s?(\d+)/i.test(t) || /season\s*\d+\s*-\s*\d+/i.test(t) || /complete\s+series/i.test(t) || /collection/i.test(t) || /anthology/i.test(t)) {
        isMultiSeason = true;
    }


    const multiSxE = /s(\d{1,2})[ ._-]*e(\d{1,3})[ ._-]*-[ ._-]*e?(\d{1,3})/i;
    const multiX = /(\d{1,2})x(\d{1,3})[ ._-]*-[ ._-]*x?(\d{1,3})/i;

    if (multiSxE.test(t) || multiX.test(t)) {
        isMultiEpisode = true;
    }
    

    const sXe = /s(\d{1,2})[ ._-]*e(\d{1,3})/i;
    const x = /\b(\d{1,2})x(\d{1,3})\b/i;
    const written = /season\s*(\d{1,2})\s*episode\s*(\d{1,3})/i;

    let match = t.match(sXe);
    if (match) {
        season = parseInt(match[1], 10);
        episode = parseInt(match[2], 10);
        matchIndex = match.index;
    } else {
        match = t.match(x);
        if (match) {
            season = parseInt(match[1], 10);
            episode = parseInt(match[2], 10);
            matchIndex = match.index;
        } else {
            match = t.match(written);
            if (match) {
                season = parseInt(match[1], 10);
                episode = parseInt(match[2], 10);
                matchIndex = match.index;
            }
        }
    }


    if (season === null) {
        const sOnly = /\bs(\d{1,2})\b/i;
        const sWritten = /season\s*(\d{1,2})\b/i;
        
        let sMatch = t.match(sOnly);
        if (sMatch) {
            season = parseInt(sMatch[1], 10);
            isSeasonPack = true;
            matchIndex = sMatch.index;
        } else {
            sMatch = t.match(sWritten);
            if (sMatch) {
                season = parseInt(sMatch[1], 10);
                isSeasonPack = true;
                matchIndex = sMatch.index;
            }
        }
    }

    if (t.includes('complete') || t.includes('season pack') || t.includes('batch')) {
        if (season !== null && episode === null) isSeasonPack = true;
        if (season !== null && episode !== null) isMultiEpisode = true; 
    }
    
    if (season !== null && episode === null && !isSeasonPack) {
         isSeasonPack = true;
    }

    return { season, episode, isSeasonPack, isMultiEpisode, isMultiSeason, matchIndex };
}

/**
 * @param {Array} items - 
 * @param {string} showTitle - 
 * @param {string|number} requiredSeason 
 * @param {string|number} requiredEpisode 
 */
export function filterTorrents(items, showTitle, requiredSeason, requiredEpisode) {
    if (!items || !items.length) return [];
    
    
    if (!showTitle) return items;

    const normShowTitle = normalizeTitle(showTitle);
    
    return items.filter(item => {
        
        let cleanTitle = item.title.replace(/^\[[^\]]+\]\s*/, '');
        
        const info = parseSceneInfo(cleanTitle); 
        
       
        if (info.matchIndex > -1) {
            
            const titlePart = cleanTitle.substring(0, info.matchIndex);
            const normTitlePart = normalizeTitle(titlePart);
            
           
            if (!normTitlePart.startsWith(normShowTitle)) return false;
            
          
            const suffix = normTitlePart.substring(normShowTitle.length).trim();
            
            
            if (suffix.length > 0) return false;
        } else {
             
             
             const normItemTitle = normalizeTitle(cleanTitle);
             
             if (!normItemTitle.startsWith(normShowTitle)) return false;
        }

        
        if (requiredSeason && requiredEpisode) {
            const reqS = parseInt(requiredSeason, 10);
            const reqE = parseInt(requiredEpisode, 10);
            
           
            if (info.season !== reqS) return false;
            if (info.episode !== reqE) return false;
            
           
            if (info.isMultiEpisode) return false;

            
            if (info.isMultiSeason) return false;
            
            
            if (info.isSeasonPack) return false;
            
            return true;
        }
        
      
        if (requiredSeason && !requiredEpisode) {
            const reqS = parseInt(requiredSeason, 10);
            
           
            if (info.season !== reqS) return false;

           
            if (info.isMultiSeason) return false;
            
            
            if (info.episode !== null) return false;
            if (info.isSeasonPack) return true;
            if (info.season !== null && info.episode === null) return true;
            
            return false;
        }
        
        return true;
    });
}
