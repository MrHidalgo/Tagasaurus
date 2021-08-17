

entity_db_fns = require('./myJS/entity-db-fns.js');
// eg. entity_db_fns.Get_All_From_DB()

console.log('in entity view')


var current_record;


function Prev_Image() {
    console.log("previous image button clicked")
    
}

async function Next_Image() {
    console.log("next image button clicked")
    await entity_db_fns.Get_All_Keys_From_DB()
    keys_tmp = entity_db_fns.Read_All_Keys_From_DB()
    console.log('keys tmp = '+keys_tmp[0])
    await entity_db_fns.Get_Record(keys_tmp[0])
    record_tmp = entity_db_fns.Read_Current_Record()
    console.log(record_tmp)
    console.log('entity name: ')
    console.log(record_tmp)
    //entity name
    document.getElementById("entityName").textContent = '#' + record_tmp.entityName;
    //entity profile image
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' + record_tmp.entityImage
    console.log(default_img)
    document.getElementById("entityProfileImg").src = default_img;

    gallery_html = `<div class="row">`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    image_set = record_tmp.entityImageSet
    image_set.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_path + element}">
        `
    });    
    gallery_html += `</div>`
    document.getElementById("entityGallery").innerHTML  = gallery_html;

    emotion_set_obj = record_tmp.entityEmotions
    for (var emotion in emotion_set_obj) {       
        document.getElementById(emotion).value = emotion_set_obj[emotion]
    }
    
    current_record = record_tmp

}

function Create_New_Entity() {
    console.log("create new entity button clicked")
    
}

function Delete_Entity() {
    console.log("Delete_Entity entity button clicked")
}

function Export_Entities() {
    console.log("Export_Entities entity button clicked")
}

function Entity_Emotion_Page() {
    console.log("entity emotion page button clicked")

    document.getElementById('entity-emotion-view').className += " active";
    document.getElementById('entity-description-view').classList.remove("active")
    document.getElementById('entity-meme-view').classList.remove("active")
    emotion_HTML = `<div class="emotion-page">                    
                    <label id="emotion-box-title" class="form-label">EMOTIONS (*)</label>
                    <hr>    
                    <label for="customRange1" class="form-label">happy range</label>
                    <input type="range" class="form-range" id="happy">                        
                    <label for="customRange1" class="form-label">sad range</label>
                    <input type="range" class="form-range" id="sad">
                    <label for="customRange1" class="form-label">confused range</label>
                    <input type="range" class="form-range" id="confused">
                    </div>`

    emotion_HTML += `<button type="button" class="btn btn-primary btn-lg" onclick="Save_Entity_Emotions()">Save</button>`
                

    document.getElementById('annotationPages').
    innerHTML = emotion_HTML

}

function Save_Entity_Emotions() {
    console.log("Save_Entity_Emotions button clicked")

}

function Entity_Description_Page() {
    console.log("entity description page button clicked")

    document.getElementById('entity-description-view').className += " active";
    document.getElementById('entity-emotion-view').classList.remove("active")
    document.getElementById('entity-meme-view').classList.remove("active")
    

    description_HTML_str = '<textarea class="form-control textarea2" id="descriptionInputEntity" ></textarea>'

    description_HTML_str += `<button type="button" class="btn btn-primary btn-lg" onclick="Save_Entity_Description()">Save</button>`

    document.getElementById('annotationPages').
    innerHTML = description_HTML_str

    console.log(current_record)
    console.log(current_record.entityDescription)
    
    document.getElementById("descriptionInputEntity").value = current_record.entityDescription
    /*document.getElementById('taglist').appendChild(Make_Tag_HTML_UL( annotation_obj[key_tmp] ))*/

}

function Save_Entity_Description() {
    console.log("Save_Entity_Description button clicked")

}

function Entity_Memes_Page() {
    console.log("entity memes page button clicked")

    document.getElementById('entity-meme-view').className += " active";
    document.getElementById('entity-emotion-view').classList.remove("active")
    document.getElementById('entity-description-view').classList.remove("active")

    document.getElementById("annotationPages")
    .textContent = "show the memes now"

    console.log(current_record)
    console.log(current_record.entityDescription)
    
    memes_array = current_record.entityMemes

    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'

    gallery_html = `<div class="row">`
    default_path = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/images/' 
    memes_array = current_record.entityMemes
    memes_array.forEach(element => {
        gallery_html += `
        <img class="imgG" src="${default_path + element}">
        `
    });    
    gallery_html += `<br><button type="button" class="btn btn-primary btn-lg" onclick="New_Entity_Memes()">Choose new memes</button>`

    document.getElementById("annotationPages").innerHTML  = gallery_html;

    /*
    gallery_html = `<div class="row">
        
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        <img class="imgG" src="${default_img}">
        `
    gallery_html += `<br><button type="button" class="btn btn-primary btn-lg" onclick="New_Entity_Memes()">Choose new memes</button>`

    document.getElementById("annotationPages").innerHTML  = gallery_html;
    */


}

function New_Entity_Memes(){
    console.log('New_Entity_Memes button pressed')
}

function Set_Entity_Name_Label(){
    document.getElementById("entityName").textContent= '#' + "Taga";

}

function Load_First_Image(){
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'
    console.log(default_img)
    document.getElementById("entityProfileImg").src = default_img;
}

function Load_Entity_Gallery(){
    console.log('entity gallery')
    default_img = __dirname.substring(0, __dirname.lastIndexOf('/')) + '/Taga.png'

    gallery_html = `<div class="row">
    
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
      <img class="imgG" src="${default_img}">
    `
    
    gallery_html += `</div>`

    document.getElementById("entityGallery").innerHTML  = gallery_html;

    /*gallery_html += `<img src="${default_img}" alt="entityMemberImage" class="img-thumbnail"></img>`*/

}

Entity_Emotion_Page()
Set_Entity_Name_Label()
Load_First_Image()
Load_Entity_Gallery()